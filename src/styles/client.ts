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
 * string is budgeted at 16 KiB (0.1.3 merged scope).
 *
 * @see docs/research/client-contract.md §7
 */
export const CLIENT_CSS = `

.livery-section,.livery-settings,.livery-panel,.livery-workspace{--lw-fg:var(--dsw-alias-label-primary);--lw-fs-display:22px;--lw-fs-title:16px;--lw-fs-body:14px;--lw-fs-label:13px;--lw-fs-caption:12px;--lw-lh:1.5;--lw-lh-title:1.3;--lw-lh-control:1.35;--lw-gap-page:24px;--lw-gap-card:16px;--lw-gap-control:8px;--lw-radius-hero:16px;--lw-radius-card:14px;--lw-radius-control:10px;--lw-2:var(--dsw-alias-label-secondary);--lw-3:var(--lw-2);--lw-line:var(--dsw-alias-border-l1);--lw-line2:var(--dsw-alias-border-l2);--lw-brand:var(--dsw-alias-brand-primary);--lw-layer:var(--dsw-alias-bg-layer-1);--lw-layer2:var(--dsh-livery-card-surface,var(--dsw-alias-bg-layer-2));--lw-mono:var(--dsw-font-family-mono);--lw-on-brand:var(--dsw-alias-label-primary-foreground);--lw-err:var(--dsw-alias-state-error-primary);--lw-warn:var(--dsw-alias-state-warn-primary);display:flex;flex-direction:column;gap:var(--lw-gap-page);min-width:0;color:var(--lw-fg);font-family:var(--dsw-font-family,inherit)}
.livery-head{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-title,.livery-panel__title{margin:0;font-size:var(--lw-fs-display);font-weight:600;line-height:var(--lw-lh-title)}
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
.livery-settings,.livery-workspace{display:flex;flex-direction:column;gap:var(--lw-gap-page);min-width:0;font-size:var(--lw-fs-body)}
.livery-panel{display:flex;flex-direction:column;height:100%;min-height:0}
.livery-panel__head{display:flex;flex-direction:column;gap:4px;padding:18px 24px 12px;border-block-end:1px solid var(--lw-line)}
.livery-panel__body{flex:1;min-height:0;overflow:auto;padding:18px 24px 26px;container-type:inline-size;container-name:livery-studio}
.livery-settings{container-type:inline-size;container-name:livery-studio}

.livery-gallery-groups{display:flex;flex-direction:column;gap:16px}
.livery-family{display:flex;flex-direction:column;gap:8px}
.livery-family__head{display:flex;align-items:baseline;gap:8px;margin:0;font-size:var(--lw-fs-body);font-weight:600;color:var(--lw-2)}
.livery-more-toggle{color:var(--lw-brand)}





.wallpaper-dropzone{display:flex;align-items:center;justify-content:center;padding:12px;border:1px dashed var(--lw-line2);border-radius:10px;color:var(--lw-2);font-size:var(--lw-fs-label);text-align:center;cursor:pointer}
.wallpaper-dropzone--over{border-color:var(--lw-brand)}

/* Card system + two-column studio layouts (hero / main modules / side rail). */
.livery-ui-card{display:flex;flex-direction:column;gap:var(--lw-gap-card);min-width:0;padding:18px 20px;border:1px solid color-mix(in srgb,var(--lw-fg) 20%,transparent);border-radius:var(--lw-radius-card);background:color-mix(in srgb,var(--lw-fg) 5%,var(--lw-layer2));box-shadow:0 1px 2px rgba(0,0,0,.06),0 10px 28px -22px rgba(0,0,0,.45);backdrop-filter:blur(14px) saturate(1.08)}
.livery-ui-card__head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.livery-ui-card__title,.livery-gallery-head__title{margin:0;font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh-title)}
.livery-ui-card__hint{margin:0;color:var(--lw-2);font-size:var(--lw-fs-label);line-height:var(--lw-lh)}
.livery-hero__meta{display:flex;align-items:center;gap:12px;min-width:0}
.livery-hero__thumb{flex:0 0 96px;width:96px;aspect-ratio:16/10;object-fit:cover;border-radius:8px;border:1px solid color-mix(in srgb,var(--lw-fg) 16%,transparent)}
.livery-hero__meta .livery-meta{flex:1 1 auto;justify-content:flex-end}
.livery-secondary .livery-check{border:1px solid color-mix(in srgb,var(--lw-fg) 20%,transparent);border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--lw-fg) 5%,var(--lw-layer2));box-shadow:0 1px 2px rgba(0,0,0,.06),0 10px 28px -22px rgba(0,0,0,.45);backdrop-filter:blur(14px) saturate(1.08)}
.wallpaper-hero__preview{position:relative;width:100%;max-height:360px;aspect-ratio:16/9;overflow:hidden;border-radius:10px;background-color:var(--lw-layer2);background-position:center;background-size:cover;border:1px solid color-mix(in srgb,var(--lw-fg) 12%,transparent)}
.wallpaper-hero__dim,.wallpaper-hero__atmo{position:absolute;inset:0;pointer-events:none;background-position:center;background-size:cover}
.wallpaper-hero__dim{background:rgba(0,0,0,1)}
.wallpaper-hero__atmo{mix-blend-mode:soft-light}
.wallpaper-hero__meta{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}
.wallpaper-hero__name{font-size:var(--lw-fs-display);font-weight:600;line-height:var(--lw-lh-title);overflow-wrap:anywhere}
.wallpaper-effects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 16px}
.wallpaper-effect{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:var(--lw-fs-label);color:var(--lw-2)}
.wallpaper-effect__control{display:flex;align-items:center;gap:8px;min-width:0}
.wallpaper-effect input{flex:1 1 auto;width:100%;min-width:96px;accent-color:var(--lw-brand)}
.wallpaper-effect output{flex:0 0 54px;padding:2px 4px;border:1px solid color-mix(in srgb,var(--lw-fg) 18%,transparent);border-radius:999px;color:var(--lw-2);font-family:var(--lw-mono);font-size:var(--lw-fs-caption);text-align:center}
.wallpaper-swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:340px;padding:2px;overflow:auto}
.wallpaper-swatch{position:relative;overflow:hidden;min-height:0;aspect-ratio:4/3;padding:6px;gap:4px;color:#fff;font-size:var(--lw-fs-caption)}
.wallpaper-swatch::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.28) 38%,rgba(0,0,0,0) 68%);pointer-events:none}
.wallpaper-swatch>span{position:relative;z-index:1;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 8px rgba(0,0,0,.55)}
.wallpaper-swatch[aria-pressed='true']{outline:2px solid var(--lw-brand);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--lw-brand) 28%,transparent)}
.wallpaper-subrow{display:flex;flex-direction:column;gap:8px;padding:10px 0;border-block-start:1px solid var(--lw-line)}
.wallpaper-subrow:first-of-type{padding-block-start:0;border-block-start:0}
@media (max-width:1099px){.wallpaper-effects-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wallpaper-swatches{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:639px){.wallpaper-effects-grid{grid-template-columns:minmax(0,1fr)}.wallpaper-swatches{grid-template-columns:repeat(3,minmax(0,1fr))}}
.livery-gallery-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.livery-gallery-head__title{margin:0;font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh)}
.livery-workspace :is(input,textarea,select){font-size:var(--lw-fs-body)}
.livery-about,.livery-about__note{display:flex;flex-direction:column;gap:4px}
.livery-about__note{color:var(--lw-2);font-size:var(--lw-fs-label)}
.livery-search :is(input,textarea){font-size:var(--lw-fs-body)}

.wallpaper-hero__empty{display:grid;place-items:center;min-height:180px;aspect-ratio:16/9;border:1px dashed var(--lw-line2);border-radius:10px;color:var(--lw-2);font-size:var(--lw-fs-label);line-height:var(--lw-lh);text-align:center}
.wallpaper-file-input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.livery-diag{max-width:100%;max-height:220px;overflow:auto;margin:0;padding:8px;border:1px solid var(--lw-line);border-radius:8px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer));color:var(--lw-2);font-family:var(--lw-mono);font-size:var(--lw-fs-caption);line-height:var(--lw-lh);white-space:pre-wrap;overflow-wrap:anywhere}
@media (prefers-reduced-transparency: reduce),(forced-colors: active){.livery-ui-card,.livery-secondary .livery-check{backdrop-filter:none}}
.livery-about{display:flex;flex-direction:column;gap:4px}
.wallpaper-recent-item{display:flex;flex-direction:column;gap:3px;min-width:0;padding:0;border:1px solid color-mix(in srgb,var(--lw-fg) 14%,transparent);border-radius:9px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer2));color:inherit;font:inherit;font-size:var(--lw-fs-caption);text-align:start;cursor:pointer;overflow:hidden}
.wallpaper-recent-thumb{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
.wallpaper-recent-title,.wallpaper-recent-source{display:block;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wallpaper-recent-source{padding-bottom:6px;color:var(--lw-2)}
.wallpaper-dropzone:focus-visible{outline:2px solid var(--lw-brand);outline-offset:2px}
.livery-preset-diff{display:flex;flex-direction:column;gap:6px;min-width:0}
.livery-preset-diff__list{display:flex;flex-direction:column;gap:4px;margin:0;padding-inline-start:18px}
/* Nine-grid focal point: native radio group, visible selected/focus state. */
.wallpaper-position{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;border:0;min-width:0}
.wallpaper-position__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-width:228px;margin:0;padding:0}
.wallpaper-position__option{position:relative;display:flex;min-width:0}
.wallpaper-position__option input{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;cursor:pointer}
.wallpaper-position__option span{display:flex;flex:1 1 auto;align-items:center;justify-content:center;min-height:36px;padding:4px 6px;border:1px solid var(--lw-line);border-radius:8px;color:var(--lw-2);font-size:var(--lw-fs-caption);line-height:var(--lw-lh);text-align:center}
.wallpaper-position__option input:checked+span{border-color:var(--lw-brand);color:var(--lw-brand);background:color-mix(in srgb,var(--lw-brand) 14%,transparent)}
.wallpaper-position__option input:focus-visible+span{outline:2px solid var(--lw-brand);outline-offset:2px}

/* ---- 0.1.4 Studio information architecture ------------------------------ */
.wallpaper-workbench{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(320px,1fr);align-items:start;gap:var(--lw-gap-page);min-width:0}
.wallpaper-hero,.wallpaper-effects-card{min-width:0}
.wallpaper-hero__preview{max-height:none;aspect-ratio:16/9}
.wallpaper-hero__info{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px;padding-block-start:2px}
.wallpaper-effects-card .wallpaper-effects-grid{grid-template-columns:minmax(0,1fr)}
.wallpaper-effects-card .wallpaper-effect__control{width:100%}
.wallpaper-effects-card .wallpaper-effect input{max-width:none}
.wallpaper-effects-card .wallpaper-position{display:flex;flex-direction:column;gap:8px;padding-block-start:var(--lw-gap-card);border-block-start:1px solid var(--lw-line)}
.wallpaper-source-card{gap:var(--lw-gap-card)}
.wallpaper-source-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:4px;border:1px solid var(--lw-line);border-radius:12px;background:color-mix(in srgb,var(--lw-fg) 4%,var(--lw-layer2))}
.wallpaper-source-tab{min-height:36px;padding:6px 12px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--lw-2);font:inherit;font-size:var(--lw-fs-body);font-weight:500;line-height:var(--lw-lh-control);cursor:pointer}
.wallpaper-source-tab[aria-selected='true']{border-color:var(--lw-brand);background:color-mix(in srgb,var(--lw-brand) 12%,transparent);color:var(--lw-fg);font-weight:600}
.wallpaper-source-tab:focus-visible{outline:2px solid var(--lw-brand);outline-offset:2px}
.wallpaper-source-panel{display:flex;flex-direction:column;gap:var(--lw-gap-card);min-width:0}
.wallpaper-source-panel[hidden]{display:none}
.wallpaper-source-section{display:flex;flex-direction:column;gap:10px;min-width:0}
.wallpaper-source-section>.livery-ui-card__title{margin:0}
.wallpaper-source-panel .livery-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wallpaper-source-panel .wallpaper-swatches{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));max-height:none}
.wallpaper-source-panel .livery-card{min-width:0}
.wallpaper-source-panel .livery-thumb__fallback{display:flex;flex-direction:column;justify-content:center;gap:10px;height:100%;padding:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--lw-brand) 12%,transparent),color-mix(in srgb,var(--lw-fg) 8%,transparent))}
.wallpaper-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px}
.wallpaper-pager__label{color:var(--lw-2);font-size:var(--lw-fs-label);line-height:var(--lw-lh-control)}
.wallpaper-recent-track{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x proximity}
.wallpaper-recent-item{flex:0 0 188px;min-width:180px;scroll-snap-align:start}
.wallpaper-recent-title{font-size:var(--lw-fs-label);line-height:var(--lw-lh-control)}
.wallpaper-manage{padding:0;overflow:hidden}
.wallpaper-manage__toggle{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;padding:16px 20px;cursor:pointer;list-style:none}
.wallpaper-manage__toggle::-webkit-details-marker{display:none}
.wallpaper-manage__toggle>span:first-child{font-size:var(--lw-fs-title);font-weight:600;line-height:var(--lw-lh-title)}
.wallpaper-manage__body{display:flex;flex-direction:column;gap:var(--lw-gap-card);padding:0 20px 20px}
.wallpaper-manage__body>.livery-ui-card{box-shadow:none;background:transparent;padding:0;border:0}
.wallpaper-local-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.wallpaper-local-grid .wallpaper-subrow{border-block-start:0;padding:0}
.livery-studio{display:flex;flex-direction:column;gap:var(--lw-gap-page);min-width:0}
.livery-hero--large .livery-ui-card__head{align-items:flex-start}
.livery-hero__layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,1fr);align-items:start;gap:var(--lw-gap-page)}
.livery-hero__visual{min-width:0}
.livery-hero__preview{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:14px;border:1px solid color-mix(in srgb,var(--lw-fg) 16%,transparent);background:color-mix(in srgb,var(--lw-fg) 6%,var(--lw-layer2))}
.livery-hero__preview--empty{display:grid;place-items:center;color:var(--lw-2);font-size:var(--lw-fs-body);text-align:center}
.livery-hero__body{display:flex;flex-direction:column;gap:16px;min-width:0}
.livery-hero__body .livery-summary{padding:0;border:0;background:transparent}
.livery-summary__name{font-size:var(--lw-fs-display);font-weight:600;line-height:var(--lw-lh-title)}
.livery-secondary{display:flex;flex-direction:column;gap:16px;min-width:0}
.livery-gallery-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto auto;gap:10px 16px;align-items:start;min-width:0}
.livery-gallery-toolbar>.livery-toolbar{display:contents}
.livery-gallery-toolbar__search{grid-column:1;grid-row:1}
.livery-gallery-toolbar__search{min-width:0}
.livery-gallery-toolbar__filters{grid-column:1 / -1;grid-row:2;min-width:0;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}
.livery-gallery-toolbar__tags{grid-column:1 / -1;grid-row:3}
.livery-gallery-toolbar__locale{grid-column:2;grid-row:1;flex-wrap:nowrap;justify-content:flex-end}
.livery-gallery-card .livery-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
.livery-card__desc{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.livery-card__name{font-size:var(--lw-fs-body);line-height:var(--lw-lh-control)}
.livery-card{padding:10px;border-radius:14px;gap:8px}
.livery-family__head{font-size:var(--lw-fs-label);text-transform:none}
.livery-ui-card{padding:18px 20px}
.wallpaper-manage.livery-ui-card{padding:0}
.livery-gallery-head{padding-block:2px}
@media (max-width: 1099px){.wallpaper-workbench{grid-template-columns:minmax(0,1fr)}.livery-hero__layout{grid-template-columns:minmax(0,1fr)}.livery-gallery-card .livery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wallpaper-source-panel .livery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container livery-studio (max-width: 959px){
  .wallpaper-workbench{grid-template-columns:minmax(0,1fr)}
  .wallpaper-effects-card .wallpaper-effects-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .livery-hero__layout{grid-template-columns:minmax(0,1fr)}
  .livery-hero__visual{display:flex;justify-content:center}
  .livery-hero__preview{max-width:320px}
  .livery-hero__layout{gap:14px}
  .livery-hero__body{gap:12px}
  .livery-hero .livery-ui-card__head{gap:2px}
  .wallpaper-workbench{gap:12px}
  .wallpaper-hero{padding:14px 16px}
  .wallpaper-hero__preview{max-height:240px}
  .wallpaper-hero__empty{aspect-ratio:auto;max-height:120px}
  .wallpaper-effects-card .livery-ui-card__hint{display:none}
  .wallpaper-effects-card{padding:10px 14px}
  .wallpaper-effects-card .wallpaper-effects-grid{gap:6px}
  .livery-gallery-card .livery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wallpaper-source-panel .livery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wallpaper-local-grid{grid-template-columns:minmax(0,1fr)}
}
@container livery-studio (max-width: 639px){
  .wallpaper-effects-card .wallpaper-effects-grid{grid-template-columns:minmax(0,1fr)}
  .livery-gallery-card .livery-grid{grid-template-columns:minmax(0,1fr)}
  .wallpaper-source-panel .livery-grid{display:flex;overflow-x:auto;padding-bottom:8px}
  .wallpaper-source-panel .livery-card{flex:0 0 260px}
  .wallpaper-source-tabs{flex-wrap:nowrap;overflow-x:auto}
  .wallpaper-source-tab{flex:0 0 auto}
  .livery-gallery-toolbar__filters{flex-wrap:nowrap}
  .wallpaper-recent-item{flex-basis:220px}
}

`
