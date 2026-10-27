/**
 * Client-owned stylesheet for the Livery settings page and main panel.
 *
 * Kept as a TypeScript template string: the shipped client bundle is one
 * self-contained classic script and cannot use a sibling `.css` import
 * (client-contract.md §1), so the string is inlined at materialization into
 * `<style data-plugin="dsh-livery" data-plugin-css="dsh-livery/client.css">`.
 *
 * House rules (docs/design/implementation-plan.md §18.3): no `!important`, no
 * hashed class selectors, no remote URLs, every declaration scoped to this
 * plugin's `.livery-*` classes, and all colour/spacing values read from
 * documented `--dsw-*` tokens (through `.livery-section` local aliases) so the
 * page follows the active host theme automatically. Text containers never
 * hard-code a width, so 200% zoom reflows instead of clipping. The shipped
 * string is budgeted at 12 KiB.
 *
 * @see docs/research/client-contract.md §7
 */
export const CLIENT_CSS = `

.livery-section,.livery-settings,.livery-panel,.livery-workspace{--lw-fg:var(--dsw-alias-label-primary);--lw-fs-display:20px;--lw-fs-title:15px;--lw-fs-body:13px;--lw-fs-label:12px;--lw-fs-caption:11px;--lw-lh:1.45;--lw-2:var(--dsw-alias-label-secondary);--lw-3:var(--lw-2);--lw-line:var(--dsw-alias-border-l1);--lw-line2:var(--dsw-alias-border-l2);--lw-brand:var(--dsw-alias-brand-primary);--lw-layer:var(--dsw-alias-bg-layer-1);--lw-layer2:var(--dsh-livery-card-surface,var(--dsw-alias-bg-layer-2));--lw-mono:var(--dsw-font-family-mono);--lw-on-brand:var(--dsw-alias-label-primary-foreground);--lw-err:var(--dsw-alias-state-error-primary);--lw-warn:var(--dsw-alias-state-warn-primary);display:flex;flex-direction:column;gap:18px;min-width:0;color:var(--lw-fg);font-family:var(--dsw-font-family,inherit)}
.livery-head{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-title,.livery-panel__title{margin:0;font-size:var(--lw-fs-display);font-weight:600;line-height:var(--lw-lh)}
.livery-subtitle,.livery-hint,.livery-panel__description{margin:0;max-width:62ch;color:var(--lw-2);font-size:var(--lw-fs-body);line-height:var(--lw-lh)}
.livery-hint{font-size:var(--lw-fs-label);color:var(--lw-3)}
.livery-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.livery-summary{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;padding:10px 12px;border:1px solid var(--lw-line);border-radius:10px;background:var(--lw-layer)}
.livery-summary__body{display:flex;flex-direction:column;gap:4px;min-width:0}
.livery-summary__name{font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh)}
.livery-summary__desc{max-width:62ch;font-size:var(--lw-fs-label);line-height:var(--lw-lh);color:var(--lw-2)}
.livery-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.livery-toolbar{display:flex;flex-direction:column;gap:10px;min-width:0}
.livery-search{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
.livery-search>*{min-width:0}
.livery-filters{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.livery-chip{padding:2px 8px;border:1px solid var(--lw-line);border-radius:999px;background:transparent;color:var(--lw-2);font:inherit;font-size:var(--lw-fs-body);line-height:var(--lw-lh);cursor:pointer}
.livery-chip[aria-pressed='true'],.livery-chip[aria-selected='true']{border-color:var(--lw-brand);color:var(--lw-brand)}
.livery-chip:focus-visible,.livery-card:focus-visible,.livery-check__toggle:focus-visible{outline:2px solid var(--lw-brand);outline-offset:2px}
.livery-previewbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 8px;padding:7px 9px;border:1px solid var(--lw-brand);background:var(--lw-layer)}
.livery-previewbar__copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.livery-previewbar__title{font-size:var(--lw-fs-body);font-weight:600;line-height:var(--lw-lh);overflow-wrap:anywhere}
.livery-previewbar__body{font-size:var(--lw-fs-label);line-height:var(--lw-lh);color:var(--lw-2)}
.livery-previewbar__actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.livery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr));gap:12px;margin:0;padding:2px}
.livery-card{position:relative;display:flex;flex-direction:column;gap:7px;width:100%;min-width:0;padding:7px;border:1px solid color-mix(in srgb,var(--lw-fg) 14%,transparent);border-radius:10px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer2));color:inherit;font:inherit;text-align:start;cursor:pointer;}
.livery-card[aria-selected='true']{border-color:var(--lw-brand);box-shadow:0 0 0 1px var(--lw-brand)}
.livery-card[data-state='incompatible']{cursor:not-allowed;opacity:.72}
.livery-thumb{position:relative;display:block;width:100%;aspect-ratio:16/10;overflow:hidden;border-radius:7px;background:var(--lw-layer2)}
.livery-thumb__img{display:block;width:100%;height:100%;object-fit:cover}
.livery-thumb__fallback::before,.livery-thumb__fallback::after{content:'';display:block;height:8px;border-radius:4px}
.livery-thumb__fallback::before{width:46%;background:var(--livery-accent)}
.livery-thumb__fallback::after{width:72%;background:color-mix(in srgb,var(--livery-text) 45%,transparent)}
.livery-card__body{display:flex;flex-direction:column;gap:3px;min-width:0}
.livery-card__name{font-size:var(--lw-fs-body);font-weight:600;line-height:var(--lw-lh);overflow-wrap:anywhere}
.livery-card__desc{font-size:var(--lw-fs-label);line-height:var(--lw-lh);color:var(--lw-2);overflow-wrap:anywhere}
.livery-card__meta{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.livery-card__badge,.livery-card__previewbadge{position:absolute;inset-block-start:14px;inset-inline-end:14px;padding:1px 7px;border-radius:999px;background:var(--lw-brand);color:var(--lw-on-brand);font-size:var(--lw-fs-caption);font-weight:600;line-height:var(--lw-lh)}
.livery-card__previewbadge{background:var(--lw-warn)}
.livery-notice{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 10px;padding:8px 10px;border:1px solid var(--lw-line);border-radius:8px;background:var(--lw-layer);font-size:var(--lw-fs-label);line-height:var(--lw-lh)}
.livery-notice--error{border-color:var(--lw-err)}
.livery-notice--warn{border-color:var(--lw-warn)}
.livery-notice--info{border-color:var(--lw-line2);background:var(--lw-layer2)}
.livery-notice__copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.livery-notice__title{font-weight:600}
.livery-notice__body{color:var(--lw-2);overflow-wrap:anywhere}
.livery-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.livery-check{border:1px solid var(--lw-line);border-radius:10px;background:var(--lw-layer)}
.livery-check__toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 12px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:var(--lw-fs-body);font-weight:600;text-align:start;cursor:pointer}
.livery-check__body{display:flex;flex-direction:column;gap:14px;padding:0 14px 14px}
.livery-check__block{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-check__title{margin:0;font-size:var(--lw-fs-label);font-weight:600;color:var(--lw-2)}
.livery-check__value{font-size:var(--lw-fs-label);line-height:var(--lw-lh);overflow-wrap:anywhere}
.livery-caps__row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-family:var(--lw-mono);font-size:var(--lw-fs-label);line-height:var(--lw-lh)}
@media (prefers-reduced-motion:reduce){.livery-chip,.livery-card{transition:none}}
.livery-settings,.livery-workspace{display:flex;flex-direction:column;gap:18px;min-width:0;font-size:var(--lw-fs-body)}
.livery-panel{display:flex;flex-direction:column;height:100%;min-height:0}
.livery-panel__head{display:flex;flex-direction:column;gap:4px;padding:18px 24px 12px;border-block-end:1px solid var(--lw-line)}
.livery-panel__body{flex:1;min-height:0;overflow:auto;padding:18px 24px 26px}

.livery-gallery-groups{display:flex;flex-direction:column;gap:16px}
.livery-family{display:flex;flex-direction:column;gap:8px}
.livery-family__head{display:flex;align-items:baseline;gap:8px;margin:0;font-size:var(--lw-fs-body);font-weight:600;color:var(--lw-2)}
.livery-more-toggle{color:var(--lw-brand)}





.wallpaper-dropzone{display:flex;align-items:center;justify-content:center;padding:12px;border:1px dashed var(--lw-line2);border-radius:10px;color:var(--lw-2);font-size:var(--lw-fs-label);text-align:center;cursor:pointer}
.wallpaper-dropzone--over{border-color:var(--lw-brand);color:var(--lw-brand)}

/* Card system + two-column studio layouts (hero / main modules / side rail). */
.livery-ui-card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px 18px;border:1px solid color-mix(in srgb,var(--lw-fg) 20%,transparent);border-radius:14px;background:color-mix(in srgb,var(--lw-fg) 5%,var(--lw-layer2));box-shadow:0 1px 2px rgba(0,0,0,.06),0 10px 28px -22px rgba(0,0,0,.45);backdrop-filter:blur(14px) saturate(1.08)}
.livery-ui-card__head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.livery-ui-card__title,.livery-gallery-head__title{margin:0;font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh)}
.livery-ui-card__hint{margin:0;color:var(--lw-2);font-size:var(--lw-fs-label);line-height:var(--lw-lh)}
.livery-layout,.wallpaper-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start;gap:20px}
.livery-main,.livery-rail,.wallpaper-main,.wallpaper-rail{display:flex;flex-direction:column;gap:20px;min-width:0}
.livery-rail,.wallpaper-rail{gap:18px}
.livery-layout .livery-summary{border:0;background:transparent;padding:0}
.livery-layout .livery-actions{padding:0}
.livery-hero__meta{display:flex;align-items:center;gap:12px;min-width:0}
.livery-hero__thumb{flex:0 0 96px;width:96px;aspect-ratio:16/10;object-fit:cover;border-radius:8px;border:1px solid color-mix(in srgb,var(--lw-fg) 16%,transparent)}
.livery-hero__meta .livery-meta{flex:1 1 auto;justify-content:flex-end}
.livery-layout .livery-check{border:1px solid color-mix(in srgb,var(--lw-fg) 20%,transparent);border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--lw-fg) 5%,var(--lw-layer2));box-shadow:0 1px 2px rgba(0,0,0,.06),0 10px 28px -22px rgba(0,0,0,.45);backdrop-filter:blur(14px) saturate(1.08)}
.wallpaper-hero__preview{position:relative;width:100%;max-height:360px;aspect-ratio:16/9;overflow:hidden;border-radius:10px;background-color:var(--lw-layer2);background-position:center;background-size:cover;border:1px solid color-mix(in srgb,var(--lw-fg) 12%,transparent)}
.wallpaper-hero__dim,.wallpaper-hero__atmo{position:absolute;inset:0;pointer-events:none;background-position:center;background-size:cover}
.wallpaper-hero__dim{background:rgba(0,0,0,1)}
.wallpaper-hero__atmo{mix-blend-mode:soft-light}
.wallpaper-hero__meta{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}
.wallpaper-hero__name{font-size:var(--lw-fs-title);font-weight:600;overflow-wrap:anywhere}
.wallpaper-effects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 16px}
.wallpaper-effect{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:var(--lw-fs-label);color:var(--lw-2)}
.wallpaper-effect__control{display:flex;align-items:center;gap:8px;min-width:0}
.wallpaper-effect input{flex:1 1 100px;width:100%;min-width:96px;max-width:140px;accent-color:var(--lw-brand)}
.wallpaper-effect output{flex:0 0 54px;padding:2px 4px;border:1px solid color-mix(in srgb,var(--lw-fg) 18%,transparent);border-radius:999px;color:var(--lw-2);font-family:var(--lw-mono);font-size:var(--lw-fs-caption);text-align:center}
.wallpaper-swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:340px;padding:2px;overflow:auto}
.wallpaper-swatch{position:relative;overflow:hidden;min-height:0;aspect-ratio:4/3;padding:6px;gap:4px;color:#fff;font-size:var(--lw-fs-caption)}
.wallpaper-swatch::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.28) 38%,rgba(0,0,0,0) 68%);pointer-events:none}
.wallpaper-swatch>span{position:relative;z-index:1;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 8px rgba(0,0,0,.55)}
.wallpaper-swatch[aria-pressed='true']{outline:2px solid var(--lw-brand);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--lw-brand) 28%,transparent)}
.wallpaper-subrow{display:flex;flex-direction:column;gap:8px;padding:10px 0;border-block-start:1px solid var(--lw-line)}
.wallpaper-subrow:first-of-type{padding-block-start:0;border-block-start:0}
@media (max-width:1099px){.livery-layout,.wallpaper-layout{grid-template-columns:minmax(0,1fr)}.wallpaper-rail{order:-1}.wallpaper-effects-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wallpaper-swatches{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:639px){.wallpaper-effects-grid{grid-template-columns:minmax(0,1fr)}.wallpaper-swatches{grid-template-columns:repeat(3,minmax(0,1fr))}}
.livery-gallery-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.livery-gallery-head__title{margin:0;font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh)}
.livery-workspace :is(input,textarea,select){font-size:var(--lw-fs-body)}
.livery-about,.livery-about__note{display:flex;flex-direction:column;gap:4px}
.livery-about__note{color:var(--lw-2);font-size:var(--lw-fs-label)}
.livery-search :is(input,textarea){font-size:var(--lw-fs-body)}
.livery-about{display:flex;flex-direction:column;gap:4px}
.livery-about__note{color:var(--lw-2)}
.wallpaper-hero__empty{display:grid;place-items:center;min-height:180px;aspect-ratio:16/9;border:1px dashed var(--lw-line2);border-radius:10px;background:color-mix(in srgb,var(--lw-layer2) 55%,transparent);color:var(--lw-2);font-size:var(--lw-fs-label);line-height:var(--lw-lh);text-align:center}
.wallpaper-file-input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.livery-diag{max-width:100%;max-height:220px;overflow:auto;margin:0;padding:8px;border:1px solid var(--lw-line);border-radius:8px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer));color:var(--lw-2);font-family:var(--lw-mono);font-size:var(--lw-fs-caption);line-height:var(--lw-lh);white-space:pre-wrap;overflow-wrap:anywhere}
.wallpaper-recent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.wallpaper-recent-item{display:flex;flex-direction:column;gap:3px;min-width:0;padding:0;border:1px solid color-mix(in srgb,var(--lw-fg) 14%,transparent);border-radius:9px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer2));color:inherit;font:inherit;font-size:var(--lw-fs-caption);text-align:start;cursor:pointer;overflow:hidden}
.wallpaper-recent-thumb{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:var(--lw-layer2)}
.wallpaper-recent-title,.wallpaper-recent-source{display:block;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wallpaper-recent-source{padding-bottom:6px;color:var(--lw-2)}
`
