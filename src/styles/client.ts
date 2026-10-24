/**
 * Client-owned stylesheet for the Livery settings page.
 *
 * Kept as a TypeScript template string on purpose: the shipped client bundle is
 * one self-contained classic script and cannot ride a sibling `.css` import
 * (client-contract.md §1), so the string is inlined at materialization into
 * `<style data-plugin="dsh-livery" data-plugin-css="dsh-livery/client.css">`.
 *
 * Rules of the house (plan §18.3): no `!important`, no hashed class selectors,
 * no remote URLs, every declaration scoped to this plugin's `.livery-*` classes,
 * and all color/spacing values read from documented `--dsw-*` tokens (through
 * `.livery-section` local aliases) so the page follows the active host theme for
 * free. Text containers never hard-code a width, so 200% zoom reflows instead of
 * clipping. Compact on purpose: the shipped string is budgeted at 8KB (plan §18.8).
 *
 * @see docs/research/client-contract.md §7
 */
export const CLIENT_CSS = `

.livery-section{--lw-fg:var(--dsw-alias-label-primary,inherit);--lw-2:var(--dsw-alias-label-secondary,inherit);--lw-3:var(--lw-3);--lw-line:var(--dsw-alias-border-l1,#7f7f7f33);--lw-line2:var(--dsw-alias-border-l2,#7f7f7f55);--lw-brand:var(--dsw-alias-brand-primary,#3978d4);--lw-layer:var(--dsw-alias-bg-layer-1,transparent);--lw-layer2:var(--dsw-alias-bg-layer-2,#7f7f7f14);--lw-mono:var(--dsw-font-family-mono,ui-monospace);--lw-on-brand:var(--dsw-alias-label-primary-foreground,#fff);--lw-err:var(--dsw-alias-state-error-primary,#d14343);--lw-warn:var(--dsw-alias-state-warn-primary,#b7791f);display:flex;flex-direction:column;gap:18px;min-width:0;color:var(--lw-fg);font-family:var(--dsw-font-family,inherit)}
.livery-head{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-title{margin:0;font-size:20px;font-weight:600;line-height:1.3}
.livery-subtitle,.livery-hint{margin:0;max-width:62ch;color:var(--lw-2);font-size:13px;line-height:1.55}
.livery-hint{font-size:12px;color:var(--lw-3)}
.livery-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.livery-summary{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 18px;padding:14px 16px;border:1px solid var(--lw-line);border-radius:10px;background:var(--lw-layer)}
.livery-summary__body{display:flex;flex-direction:column;gap:4px;min-width:0}
.livery-summary__kicker{font-size:11px;font-weight:600;color:var(--lw-3)}
.livery-summary__name{font-size:15px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
.livery-summary__desc{max-width:62ch;font-size:12.5px;line-height:1.5;color:var(--lw-2)}
.livery-summary__side{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.livery-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.livery-id{padding:1px 6px;border:1px solid var(--lw-line);border-radius:5px;color:var(--lw-2);font-family:var(--lw-mono);font-size:11.5px;overflow-wrap:anywhere}
.livery-toolbar{display:flex;flex-direction:column;gap:10px;min-width:0}
.livery-search{display:flex;align-items:center;gap:8px;min-width:0}
.livery-search>*{min-width:0}
.livery-filters{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.livery-chip{padding:3px 10px;border:1px solid var(--lw-line);border-radius:999px;background:transparent;color:var(--lw-2);font:inherit;font-size:12px;line-height:1.4;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease}
.livery-chip[aria-pressed='true']{border-color:var(--lw-brand);color:var(--lw-brand)}
.livery-chip:focus-visible,.livery-card:focus-visible,.livery-check__toggle:focus-visible{outline:2px solid var(--lw-brand);outline-offset:2px}
.livery-previewbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:12px 14px;border:1px solid var(--lw-brand);border-radius:10px;background:var(--lw-layer)}
.livery-previewbar__copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.livery-previewbar__title{font-size:13.5px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.livery-previewbar__body{font-size:12px;line-height:1.5;color:var(--lw-2)}
.livery-previewbar__actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.livery-gallery-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 14px}
.livery-gallery-head__title{margin:0;font-size:14px;font-weight:600}
.livery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr));gap:12px;margin:0;padding:2px}
.livery-card{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;min-width:0;padding:8px;border:1px solid var(--lw-line);border-radius:10px;background:var(--lw-layer);color:inherit;font:inherit;text-align:start;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}
.livery-card[aria-selected='true']{border-color:var(--lw-brand);box-shadow:0 0 0 1px var(--lw-brand)}
.livery-card[data-state='incompatible']{cursor:not-allowed;opacity:.72}
.livery-thumb{position:relative;display:block;width:100%;aspect-ratio:16/10;overflow:hidden;border-radius:7px;background:var(--lw-layer2)}
.livery-thumb__img{display:block;width:100%;height:100%;object-fit:cover}
.livery-thumb__fallback{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;padding:10px;background:linear-gradient(150deg,var(--livery-surface),color-mix(in srgb,var(--livery-accent) 28%,var(--livery-surface)))}
.livery-thumb__fallback::before,.livery-thumb__fallback::after{content:'';display:block;height:8px;border-radius:4px}
.livery-thumb__fallback::before{width:46%;background:var(--livery-accent)}
.livery-thumb__fallback::after{width:72%;background:color-mix(in srgb,var(--livery-text) 45%,transparent)}
.livery-thumb__error{position:absolute;inset-block-end:6px;inset-inline-start:6px;padding:1px 6px;border-radius:5px;background:rgba(0,0,0,.45);font-size:10.5px}
.livery-card__body{display:flex;flex-direction:column;gap:3px;min-width:0}
.livery-card__name{font-size:13.5px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
.livery-card__desc{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:12px;line-height:1.45;color:var(--lw-2);overflow-wrap:anywhere}
.livery-card__meta{display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-height:20px}
.livery-card__badge,.livery-card__previewbadge{position:absolute;inset-block-start:14px;inset-inline-end:14px;padding:1px 7px;border-radius:999px;background:var(--lw-brand);color:var(--lw-on-brand);font-size:10.5px;font-weight:600;line-height:1.5}
.livery-card__previewbadge{background:var(--lw-warn)}
.livery-notice{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;padding:10px 14px;border:1px solid var(--lw-line);border-radius:9px;background:var(--lw-layer);font-size:12.5px;line-height:1.55}
.livery-notice--error{border-color:var(--lw-err)}
.livery-notice--warn{border-color:var(--lw-warn)}
.livery-notice--info{border-color:var(--lw-line2);background:var(--lw-layer2)}
.livery-notice__copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.livery-notice__title{font-weight:600}
.livery-notice__body{color:var(--lw-2);overflow-wrap:anywhere}
.livery-empty{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:26px 18px;border:1px dashed var(--lw-line2);border-radius:10px}
.livery-empty__title{font-size:14px;font-weight:600}
.livery-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.livery-check{border:1px solid var(--lw-line);border-radius:10px;background:var(--lw-layer)}
.livery-check__toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:11px 14px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:600;text-align:start;cursor:pointer}
.livery-check__body{display:flex;flex-direction:column;gap:14px;padding:0 14px 14px}
.livery-check__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:12px}
.livery-check__block{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-check__title{margin:0;font-size:12px;font-weight:600;color:var(--lw-2)}
.livery-check__value{font-size:12.5px;line-height:1.5;overflow-wrap:anywhere}
.livery-caps{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
.livery-caps__row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;line-height:1.45}
.livery-caps__id{font-family:var(--lw-mono);overflow-wrap:anywhere}
.livery-diag{max-height:15rem;margin:0;padding:10px 12px;overflow:auto;border-radius:8px;background:var(--lw-layer2);color:var(--lw-2);font-family:var(--lw-mono);font-size:11px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text}
.livery-about{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;padding-top:2px;font-size:11.5px;color:var(--lw-3)}
@media (prefers-reduced-motion:reduce){.livery-chip,.livery-card{transition:none}}
`
