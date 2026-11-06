"""Generate and verify the 24 pronunciation recordings. Credentials stay in memory."""

import hashlib
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unicodedata
import urllib.error
import urllib.request
import wave
from xml.sax.saxutils import escape


APP = Path(__file__).resolve().parents[1]
VOICES = {"female": "en-US-AvaNeural", "male": "en-US-AndrewNeural"}
PHONEMES = {"bonito": "bəˈniːtoʊ"}


def request(url, headers, data=None):
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # Do not include request headers or authentication values in diagnostics.
        raise RuntimeError(f"Speech request failed: HTTP {error.code}") from None


def authentication():
    key = os.environ.get("AZURE_SPEECH_KEY")
    if key:
        region = os.environ["AZURE_SPEECH_REGION"]
        if not re.fullmatch(r"[a-z0-9]+", region):
            raise ValueError("Invalid Speech region")
        return (
            f"https://{region}.tts.speech.microsoft.com",
            f"https://{region}.stt.speech.microsoft.com",
            {"Ocp-Apim-Subscription-Key": key},
        )
    endpoint = os.environ["AZURE_SPEECH_ENDPOINT"].rstrip("/")
    if not re.fullmatch(r"https://[a-z0-9-]+\.cognitiveservices\.azure\.com", endpoint):
        raise ValueError("Expected an Azure Cognitive Services HTTPS endpoint")
    resource_id = os.environ["AZURE_SPEECH_RESOURCE_ID"]
    subscription = resource_id.split("/")[2]
    az = shutil.which("az")
    if not az:
        raise RuntimeError("Azure CLI is required for Entra authentication")
    result = subprocess.run(
        [az, "account", "get-access-token", "--subscription", subscription,
         "--resource", "https://cognitiveservices.azure.com",
         "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode or not result.stdout.strip():
        raise RuntimeError("Azure CLI authentication failed; sign in to the intended subscription")
    token = result.stdout.strip()
    return endpoint + "/tts", endpoint + "/stt", {
        "Authorization": f"Bearer aad#{resource_id}#{token}"
    }


def normalize(text):
    return " ".join("".join(
        ch for ch in text.casefold()
        if not unicodedata.category(ch).startswith("P")
    ).split())


def main():
    ffmpeg = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("Install ffmpeg or set FFMPEG_PATH to its executable")
    items = re.findall(
        r'id: "([a-z-]+)", word: "([^"]+)"',
        (APP / "index.html").read_text(encoding="utf-8"),
    )
    if len(items) != 12 or len({cid for cid, _ in items}) != 12:
        raise ValueError("Expected exactly 12 unique creatures")
    tts, stt, auth = authentication()
    voices = json.loads(request(tts + "/cognitiveservices/voices/list", auth))
    available = {v["ShortName"]: v for v in voices}
    for gender, name in VOICES.items():
        if name not in available or available[name]["Locale"] != "en-US":
            raise RuntimeError(f"Required American English voice unavailable: {name}")
        if available[name]["Gender"].lower() != gender:
            raise RuntimeError(f"Unexpected voice gender: {name}")
    results = []
    with tempfile.TemporaryDirectory(prefix="sea-creatures-audio-") as temporary:
        stage = Path(temporary)
        for cid, word in items:
            hashes = []
            for gender, voice in VOICES.items():
                filename = f"{cid}-{gender}.mp3"
                spoken = escape(word)
                if cid in PHONEMES:
                    spoken = f'<phoneme alphabet="ipa" ph="{PHONEMES[cid]}">{spoken}</phoneme>'
                ssml = (
                    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
                    f'xml:lang="en-US"><voice name="{voice}">{spoken}</voice></speak>'
                )
                audio = request(tts + "/cognitiveservices/v1", {
                    **auth,
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                    "User-Agent": "sea-creatures-pronunciation",
                }, ssml.encode("utf-8"))
                mp3 = stage / filename
                mp3.write_bytes(audio)
                wav = stage / f"{cid}-{gender}.wav"
                subprocess.run(
                    [ffmpeg, "-v", "error", "-y", "-i", str(mp3),
                     "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)],
                    check=True,
                )
                with wave.open(str(wav), "rb") as decoded:
                    duration = decoded.getnframes() / decoded.getframerate()
                if not 0.3 <= duration <= 3:
                    raise RuntimeError(f"{filename}: duration {duration:.3f}s outside 0.3-3s")
                recognition = json.loads(request(
                    stt + "/speech/recognition/conversation/cognitiveservices/v1?language=en-US",
                    {**auth, "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000"},
                    wav.read_bytes(),
                ))
                transcript = recognition.get("DisplayText", "")
                exact_match = recognition.get("RecognitionStatus") == "Success" and normalize(transcript) == normalize(word)
                assessment = None
                if not exact_match:
                    if cid != "bonito" or normalize(transcript) != "benito":
                        raise RuntimeError(f"{filename}: expected {word!r}, recognized {transcript!r}")
                    # This name/word ambiguity is retained as a review item, not reported as an exact match.
                    parameters = base64.b64encode(json.dumps({
                        "ReferenceText": word, "GradingSystem": "HundredMark",
                        "Granularity": "Phoneme", "Dimension": "Comprehensive",
                    }).encode()).decode()
                    response = json.loads(request(
                        stt + "/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed",
                        {**auth, "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
                         "Pronunciation-Assessment": parameters},
                        wav.read_bytes(),
                    ))
                    if response.get("RecognitionStatus") != "Success":
                        raise RuntimeError(f"{filename}: pronunciation assessment failed")
                    assessment = response["NBest"][0]
                    if assessment["AccuracyScore"] < 95:
                        raise RuntimeError(f"{filename}: pronunciation assessment below 95")
                digest = hashlib.sha256(audio).hexdigest()
                hashes.append(digest)
                results.append({
                    "file": filename, "word": word, "voice": voice,
                    "durationSeconds": round(duration, 3),
                    "recognizedText": transcript, "sha256": digest,
                    "phoneme": PHONEMES.get(cid),
                    "recognitionExactMatch": exact_match,
                    "humanReviewRequired": not exact_match,
                    "referenceAssistedAssessment": assessment,
                })
                label = "PASS" if exact_match else "REVIEW (name/word ambiguity)"
                print(f"{label} {filename}: {duration:.3f}s / {transcript}", flush=True)
            if hashes[0] == hashes[1]:
                raise RuntimeError(f"{cid}: male and female recordings are identical")
        out = APP / "audio"
        out.mkdir(exist_ok=True)
        for result in results:
            shutil.copyfile(stage / result["file"], out / result["file"])
        (out / "verification.json").write_text(
            json.dumps({
                "provider": "Microsoft Azure AI Speech",
                "format": "audio-24khz-48kbitrate-mono-mp3",
                "recordings": results,
                "limitation": "Speech recognition checks words, not phonetic accuracy. Human listening is still required.",
            }, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    exact_count = sum(r["recognitionExactMatch"] for r in results)
    print(f"24 recordings generated; {exact_count} exact recognition matches; {24 - exact_count} require human review.")


if __name__ == "__main__":
    main()
