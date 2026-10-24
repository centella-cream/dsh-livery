/**
 * Client-owned stylesheet for the Livery settings page.
 *
 * Kept as a TypeScript template string on purpose: the shipped client bundle is
 * one self-contained classic script and cannot ride a sibling `.css` import
 * (client-contract.md §1), so the string is inlined at materialization into
 * `<style data-plugin="dsh-livery" data-plugin-css="dsh-livery/client.css">`.
 *
 * Rules of the house (plan §18.3): no `!important`, no hashed class selectors,
 * no remote URLs, every token scoped to this plugin's `.livery-*` classes, all
 * color/spacing values read from documented `--dsw-*` tokens so the page
 * follows the active host theme for free. Text containers never hard-code a
 * width, so 200% zoom reflows instead of clipping.
 *
 * @see docs/research/client-contract.md §7
 */
export const CLIENT_CSS = `
.livery-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: var(--dsw-font-family, inherit);
}
.livery-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.livery-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}
.livery-subtitle,
.livery-hint {
  margin: 0;
  max-width: 62ch;
  color: var(--dsw-alias-label-secondary, inherit);
  font-size: 13px;
  line-height: 1.55;
}
.livery-hint { font-size: 12px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary, inherit)); }
.livery-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* Current livery summary */
.livery-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, transparent);
}
.livery-summary__body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.livery-summary__kicker {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary, inherit));
}
.livery-summary__name { font-size: 15px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.livery-summary__desc { font-size: 12.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); max-width: 62ch; }
.livery-summary__side { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.livery-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.livery-meta__label { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary, inherit)); }
.livery-id {
  font-family: var(--dsw-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  padding: 1px 6px;
  border-radius: 5px;
  border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33);
  color: var(--dsw-alias-label-secondary, inherit);
  overflow-wrap: anywhere;
}

/* Toolbar */
.livery-toolbar { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.livery-search { display: flex; align-items: center; gap: 8px; min-width: 0; }
.livery-search > * { min-width: 0; }
.livery-search__clear { flex: none; }
.livery-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.livery-filters__label { font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); margin-right: 2px; }
.livery-chip {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  padding: 3px 10px;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.livery-chip:hover { background: var(--dsw-alias-bg-layer-2, #7f7f7f14); }
.livery-chip[aria-pressed='true'] {
  border-color: var(--dsw-alias-brand-primary, #3978d4);
  color: var(--dsw-alias-brand-primary, #3978d4);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #3978d4) 10%, transparent);
}
.livery-chip:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3978d4);
  outline-offset: 2px;
}

/* Preview bar */
.livery-previewbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-brand-primary, #3978d4);
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #3978d4) 8%, var(--dsw-alias-bg-layer-1, transparent));
}
.livery-previewbar__copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.livery-previewbar__title { font-size: 13.5px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.livery-previewbar__body { font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); line-height: 1.5; }
.livery-previewbar__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

/* Gallery */
.livery-gallery-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 14px; }
.livery-gallery-head__title { margin: 0; font-size: 14px; font-weight: 600; }
.livery-gallery-head__count { font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); }
.livery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 12px;
  margin: 0;
  padding: 2px;
  list-style: none;
}
.livery-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.livery-card:hover { border-color: var(--dsw-alias-border-l2, #7f7f7f55); }
.livery-card:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3978d4);
  outline-offset: 2px;
}
.livery-card[aria-selected='true'] {
  border-color: var(--dsw-alias-brand-primary, #3978d4);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, #3978d4);
}
.livery-card[data-state='incompatible'] { cursor: not-allowed; opacity: .72; }
.livery-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2, #7f7f7f14);
}
.livery-thumb__img { display: block; width: 100%; height: 100%; object-fit: cover; }
.livery-thumb__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 5px;
  padding: 10px;
  background:
    radial-gradient(120% 150% at 0% 0%, color-mix(in srgb, var(--livery-accent) 26%, transparent), transparent 62%),
    linear-gradient(150deg, var(--livery-surface) 0%, color-mix(in srgb, var(--livery-secondary) 24%, var(--livery-surface)) 100%);
}
.livery-thumb__fallback::before,
.livery-thumb__fallback::after {
  content: '';
  display: block;
  height: 8px;
  border-radius: 4px;
}
.livery-thumb__fallback::before { width: 46%; background: var(--livery-accent); }
.livery-thumb__fallback::after { width: 72%; background: color-mix(in srgb, var(--livery-text) 45%, transparent); }
.livery-thumb__error {
  position: absolute;
  inset-block-end: 6px;
  inset-inline-start: 6px;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-overlay, #00000066);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 10.5px;
  line-height: 1.5;
}
.livery-card__body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.livery-card__name { font-size: 13.5px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.livery-card__desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--dsw-alias-label-secondary, inherit);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.livery-card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 20px; }
.livery-card__badge {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-end: 14px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.5;
  background: var(--dsw-alias-brand-primary, #3978d4);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.livery-card__previewbadge {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-end: 14px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.5;
  background: var(--dsw-alias-state-warn-primary, #b7791f);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}

/* States, notices and errors */
.livery-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
  padding: 10px 14px;
  border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  font-size: 12.5px;
  line-height: 1.55;
}
.livery-notice--error { border-color: var(--dsw-alias-state-error-primary, #d14343); }
.livery-notice--warn { border-color: var(--dsw-alias-state-warn-primary, #b7791f); }
.livery-notice__copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.livery-notice__title { font-weight: 600; }
.livery-notice__body { color: var(--dsw-alias-label-secondary, inherit); overflow-wrap: anywhere; }
.livery-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 26px 18px;
  border: 1px dashed var(--dsw-alias-border-l2, #7f7f7f55);
  border-radius: 10px;
  background: transparent;
}
.livery-empty__title { font-size: 14px; font-weight: 600; }
.livery-empty__body { font-size: 12.5px; color: var(--dsw-alias-label-secondary, inherit); }
.livery-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.livery-loading { display: flex; align-items: center; gap: 8px; padding: 18px 2px; font-size: 13px; color: var(--dsw-alias-label-secondary, inherit); }

/* Self-check */
.livery-check { border: 1px solid var(--dsw-alias-border-l1, #7f7f7f33); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, transparent); }
.livery-check__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: start;
}
.livery-check__toggle:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #3978d4); outline-offset: 2px; }
.livery-check__body { display: flex; flex-direction: column; gap: 14px; padding: 0 14px 14px; }
.livery-check__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: 12px; }
.livery-check__block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.livery-check__title { margin: 0; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary, inherit); text-transform: uppercase; letter-spacing: .05em; }
.livery-check__value { font-size: 12.5px; line-height: 1.5; overflow-wrap: anywhere; }
.livery-caps { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.livery-caps__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; line-height: 1.45; min-width: 0; }
.livery-caps__id { font-family: var(--dsw-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace); overflow-wrap: anywhere; }
.livery-diag {
  margin: 0;
  padding: 10px 12px;
  max-height: 15rem;
  overflow: auto;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #7f7f7f14);
  color: var(--dsw-alias-label-secondary, inherit);
  font-family: var(--dsw-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}
.livery-about {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  padding-top: 2px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary, inherit));
}
.livery-about__note { flex-basis: 100%; }

@media (prefers-reduced-motion: reduce) {
  .livery-chip,
  .livery-card {
    transition: none;
  }
}
@media (forced-colors: active) {
  .livery-card,
  .livery-chip,
  .livery-summary,
  .livery-check {
    border-color: CanvasText;
  }
  .livery-card:focus-visible,
  .livery-chip:focus-visible,
  .livery-check__toggle:focus-visible {
    outline-color: Highlight;
  }
  .livery-card__badge,
  .livery-card__previewbadge {
    border: 1px solid CanvasText;
  }
}
`
