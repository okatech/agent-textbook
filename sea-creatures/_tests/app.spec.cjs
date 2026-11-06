const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ids = ['shark', 'dolphin', 'penguin', 'sea-turtle', 'ray', 'jellyfish', 'hammerhead-shark', 'orca', 'mackerel', 'clownfish', 'sardine', 'bonito'];
const app = path.resolve(__dirname, '..');

async function mockAudio(page, saved) {
  await page.addInitScript(({ saved }) => {
    if (saved !== undefined) localStorage.setItem('seaPron', saved);
    window.recordings = [];
    window.audioMode = 'normal';
    window.Audio = class {
      constructor(src) { this.src = src; this.paused = true; window.recordings.push(this); }
      play() {
        this.paused = false;
        if (window.audioMode === 'blocked') return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
        if (window.audioMode === 'pending') return new Promise((resolve, reject) => { this.reject = reject; });
        this.onplaying?.();
        return Promise.resolve();
      }
      pause() { this.paused = true; this.onpause?.(); }
      removeAttribute(name) { if (name === 'src') this.src = ''; }
      load() {}
    };
  }, { saved });
  await page.goto('/sea-creatures/');
}

test('all 24 bundled recordings have verified hashes, different voices and valid provenance', async () => {
  const report = JSON.parse(fs.readFileSync(path.join(app, 'audio', 'verification.json')));
  expect(report.recordings).toHaveLength(24);
  expect(new Set(report.recordings.map(r => r.file)).size).toBe(24);
  for (const id of ids) {
    const pair = ['female', 'male'].map(gender => {
      const r = report.recordings.find(item => item.file === `${id}-${gender}.mp3`);
      expect(r).toBeTruthy();
      expect(r.word).toBe(id.replaceAll('-', ' '));
      expect(r.voice).toBe(gender === 'female' ? 'en-US-AvaNeural' : 'en-US-AndrewNeural');
      expect(r.durationSeconds).toBeGreaterThanOrEqual(0.3);
      expect(r.durationSeconds).toBeLessThanOrEqual(3);
      const bytes = fs.readFileSync(path.join(app, 'audio', r.file));
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(r.sha256);
      const recognized = r.recognizedText.toLowerCase().replace(/[^\w\s]/g, '').trim();
      expect(r.recognitionExactMatch).toBe(recognized === r.word);
      expect(r.humanReviewRequired).toBe(!r.recognitionExactMatch);
      if (!r.recognitionExactMatch) {
        expect(r.file).toBe('bonito-female.mp3');
        expect(r.humanReviewRequired).toBe(true);
        expect(r.referenceAssistedAssessment.AccuracyScore).toBeGreaterThanOrEqual(95);
      }
      return r.sha256;
    });
    expect(pair[0]).not.toBe(pair[1]);
  }
});

test('gender selection and details are silent; all 24 card paths are correct', async ({ page }) => {
  await mockAudio(page);
  await expect(page.locator('.card')).toHaveCount(12);
  const gridTop = await page.locator('#grid').evaluate(grid => grid.getBoundingClientRect().top);
  await page.locator('.card').first().click();
  expect(await page.locator('#grid').evaluate(grid => grid.getBoundingClientRect().top)).toBe(gridTop);
  for (const gender of ['female', 'male']) {
    const before = await page.evaluate(() => recordings.length);
    await page.locator(`[data-gender="${gender}"]`).click();
    expect(await page.evaluate(() => recordings.length)).toBe(before);
    for (const [index, id] of ids.entries()) {
      await page.locator('.card').nth(index).click();
      expect(await page.evaluate(() => recordings.at(-1).src)).toBe(`audio/${id}-${gender}.mp3`);
      await expect(page.locator('.card.playing')).toHaveCount(1);
    }
  }
  const before = await page.evaluate(() => recordings.length);
  await page.getByRole('button', { name: 'シュモクザメを詳しく見る', exact: true }).click();
  expect(await page.evaluate(() => recordings.length)).toBe(before);
  await expect(page.getByRole('dialog', { name: 'hammerhead shark' })).toBeVisible();
  await page.getByRole('button', { name: '🔊 聞く' }).click();
  expect(await page.evaluate(() => recordings.at(-1).src)).toBe('audio/hammerhead-shark-male.mp3');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  expect(await page.evaluate(() => recordings.at(-1).paused)).toBe(true);
  await expect(page.locator('[aria-busy]')).toHaveCount(0);
});

test('all detail buttons show the correct word without playback, then play that word', async ({ page }) => {
  await mockAudio(page);
  for (const [index, id] of ids.entries()) {
    const before = await page.evaluate(() => recordings.length);
    await page.locator('[aria-haspopup="dialog"]').nth(index).click();
    await expect(page.locator('#detail-title')).toHaveText(id.replaceAll('-', ' '));
    expect(await page.evaluate(() => recordings.length)).toBe(before);
    await page.locator('[data-play]').click();
    expect(await page.evaluate(() => recordings.at(-1).src)).toBe(`audio/${id}-female.mp3`);
    await page.locator('[data-close]').click();
  }
});

test('rapid taps ignore stale callbacks and rejected play promises', async ({ page }) => {
  await mockAudio(page);
  await page.evaluate(() => { window.audioMode = 'pending'; });
  await page.locator('.card').nth(0).click();
  await page.evaluate(() => {
    window.staleEnd = recordings[0].onended;
    window.staleError = recordings[0].onerror;
    window.audioMode = 'normal';
  });
  await page.locator('.card').nth(1).click();
  await page.evaluate(() => {
    staleEnd(); staleError();
    recordings[0].reject(new DOMException('Superseded', 'AbortError'));
  });
  await expect(page.locator('.card').nth(1)).toHaveClass('card playing');
  await expect(page.locator('#note')).toBeHidden();
  await page.evaluate(() => recordings.at(-1).onended());
  await expect(page.locator('.playing')).toHaveCount(0);
  await expect(page.locator('[aria-busy]')).toHaveCount(0);
});

test('switching voice cancels playback without starting another recording', async ({ page }) => {
  await mockAudio(page);
  await page.locator('.card').first().click();
  await page.locator('[data-gender="male"]').click();
  expect(await page.evaluate(() => recordings.length)).toBe(1);
  expect(await page.evaluate(() => recordings[0].paused)).toBe(true);
  await expect(page.locator('.playing')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-gender="male"]')).toHaveAttribute('aria-pressed', 'true');
});

test('media errors, blocked playback and retries are visible, including inside the dialog', async ({ page }) => {
  await mockAudio(page);
  await page.evaluate(() => { window.audioMode = 'blocked'; });
  await page.locator('.card').first().click();
  await expect(page.locator('#note')).toContainText('許可されません');
  await expect(page.locator('[aria-busy]')).toHaveCount(0);
  await page.evaluate(() => { window.audioMode = 'normal'; });
  await page.locator('.card').first().click();
  await expect(page.locator('#note')).toBeHidden();
  await page.evaluate(() => {
    recordings.at(-1).onpause?.();
    recordings.at(-1).onerror?.();
  });
  await expect(page.locator('#note')).toContainText('読み込めません');
  await page.locator('[aria-haspopup="dialog"]').first().click();
  await page.locator('[data-play]').click();
  await page.evaluate(() => recordings.at(-1).onerror());
  await expect(page.locator('#dlg .audio-note')).toBeVisible();
  await expect(page.locator('#dlg .audio-note')).toContainText('読み込めません');
});

test('stalled loading times out and background/pagehide stops playback', async ({ page }) => {
  await mockAudio(page);
  await page.clock.install();
  await page.evaluate(() => { window.audioMode = 'pending'; });
  await page.locator('.card').first().click();
  await page.clock.fastForward(12001);
  await expect(page.locator('#note')).toContainText('完了しません');
  expect(await page.evaluate(() => recordings.at(-1).paused)).toBe(true);
  await page.evaluate(() => { window.audioMode = 'normal'; });
  await page.locator('.card').first().click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.playing')).toHaveCount(0);
  expect(await page.evaluate(() => recordings.at(-1).paused)).toBe(true);
  await page.locator('.card').first().click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await page.evaluate(() => recordings.at(-1).paused)).toBe(true);
});

test('dialog closes with Escape/backdrop, restores focus, and retains padding clicks', async ({ page }) => {
  await mockAudio(page);
  const more = page.locator('[aria-haspopup="dialog"]').first();
  await more.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#dlg')).not.toBeVisible();
  await expect(more).toBeFocused();
  await more.click();
  const rect = await page.locator('#dlg').boundingBox();
  await page.mouse.click(rect.x + 8, rect.y + 32);
  await expect(page.locator('#dlg')).toBeVisible();
  await page.locator('#dlg').dispatchEvent('click', { clientX: rect.x + 1, clientY: rect.y + 32 });
  await expect(page.locator('#dlg')).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(page.locator('#dlg')).not.toBeVisible();
  await expect(page.locator('body')).not.toHaveClass('modal-open');
});

for (const saved of ['{broken', 'null', '{"gender":"invalid"}', '{"gender":"male"}']) {
  test(`saved preference is handled: ${saved}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await mockAudio(page, saved);
    await expect(page.locator('.card')).toHaveCount(12);
    await expect(page.locator(`[data-gender="${saved.includes('"male"') ? 'male' : 'female'}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}

test('unavailable storage does not break playback and explains persistence limit', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
  });
  await mockAudio(page);
  await page.locator('[data-gender="male"]').click();
  await expect(page.locator('#note')).toContainText('保存できません');
  await page.locator('.card').first().click();
  expect(await page.evaluate(() => recordings.at(-1).src)).toBe('audio/shark-male.mp3');
});

test('in-app browsers show guidance but no device voice warnings', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 iPhone Line/15.0' });
  const page = await context.newPage();
  await mockAudio(page);
  await expect(page.locator('#note')).toContainText('Safari');
  await page.locator('[data-gender="male"]').click();
  await expect(page.locator('#note')).not.toContainText('高さ');
  await context.close();
});

for (const width of [320, 375, 390, 412]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`mobile layout ${width}px ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 667 });
      await page.emulateMedia({ colorScheme });
      await mockAudio(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const boxes = await page.locator('.card').evaluateAll(cards => cards.map(c => c.getBoundingClientRect().height));
      expect(boxes.every(height => height >= 44)).toBe(true);
      for (const index of [6, 8, 11]) {
        await page.locator('[aria-haspopup="dialog"]').nth(index).click();
        expect(await page.locator('#dlg').evaluate(d => d.scrollWidth <= d.clientWidth)).toBe(true);
        expect(await page.locator('#detail-title').evaluate(h => h.scrollWidth <= h.clientWidth)).toBe(true);
        expect(await page.locator('#dlg').evaluate(d => d.scrollTop)).toBe(0);
        await page.locator('[data-close]').click();
      }
    });
  }
}

test('real MP3 decoding succeeds for all 24 assets and images load', async ({ page, browserName }) => {
  await page.goto('/sea-creatures/');
  const images = await page.locator('.card img').evaluateAll(async images => {
    await Promise.all(images.map(img => img.decode()));
    return images.every(img => img.naturalWidth === 360);
  });
  expect(images).toBe(true);
  test.skip(browserName === 'webkit' && process.platform === 'win32',
    'Playwright Windows WebKit does not expose Web Audio; Linux CI runs this check.');
  const decoded = await page.evaluate(async ids => {
    const context = new AudioContext();
    const results = [];
    for (const id of ids) {
      for (const gender of ['female', 'male']) {
        const response = await fetch(`audio/${id}-${gender}.mp3`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        const samples = buffer.getChannelData(0);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        results.push({ duration: buffer.duration, peak });
      }
    }
    await context.close();
    return results;
  }, ids);
  expect(decoded).toHaveLength(24);
  for (const result of decoded) {
    expect(result.duration).toBeGreaterThanOrEqual(0.3);
    expect(result.duration).toBeLessThanOrEqual(3);
    expect(result.peak).toBeGreaterThan(0.01);
    expect(result.peak).toBeLessThanOrEqual(1);
  }
});

test('real tap playback ends without an error and missing media can be retried', async ({ page }) => {
  await page.goto('/sea-creatures/');
  await page.locator('.card').first().click();
  await expect(page.locator('.card.playing')).toHaveCount(1);
  await expect(page.locator('.card.playing')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#note')).toBeHidden();
  // WebKit may load media outside Playwright's route interception. Use a real missing URL.
  await page.evaluate(() => {
    window.NativeAudio = window.Audio;
    window.Audio = function(src) { return new window.NativeAudio(src.replace('dolphin', 'missing')); };
  });
  await page.locator('.card').nth(1).click();
  await expect(page.locator('#note')).toBeVisible();
  await expect(page.locator('[aria-busy]')).toHaveCount(0);
  await page.evaluate(() => { window.Audio = window.NativeAudio; });
  await page.locator('.card').nth(1).click();
  await expect(page.locator('.card.playing')).toHaveCount(1);
  await expect(page.locator('.card.playing')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#note')).toBeHidden();
});
