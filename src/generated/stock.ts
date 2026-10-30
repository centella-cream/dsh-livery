/**
 * GENERATED — do not edit by hand.
 *
 * Per-host-version stock token snapshots for the SHIPPED adapters only (formal
 * support-matrix g6-approved/released entries). Each Livery catalog is compiled
 * against the stock tokens of the exact host version it targets, so a token
 * added or changed by the host can never silently inherit a different palette.
 * Regenerate with `pnpm contract:regenerate`.
 */
import type { TokenMap } from "../core/types.js";

export interface StockTokenDeclaration {
  readonly category: string;
  /** Raw light-mode declaration value. */
  readonly light: string;
  /** Raw dark-mode declaration value (theme-invariant tokens repeat light). */
  readonly dark: string;
  /** Value after resolving `var()` chains, when resolvable. */
  readonly resolvedLight: string | null;
  readonly resolvedDark: string | null;
  readonly selector: string | null;
  readonly darkSelector: string | null;
  readonly themeInvariant: boolean;
  readonly referencedBy: readonly string[];
}

export interface StockSnapshot {
  readonly version: string;
  readonly tokenContractHash: string;
  readonly tokens: Readonly<Record<string, StockTokenDeclaration>>;
  readonly dshVariables: Readonly<Record<string, Readonly<{ light: string | null; dark: string | null; notes: string | null; declared: boolean }>>>;
}

/** Stock token snapshots keyed by exact host version, ascending. */
export const STOCK_BY_VERSION: Readonly<Record<string, StockSnapshot>> = {
  "0.2.1-rc.2": {
    "version": "0.2.1-rc.2",
    "tokenContractHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "tokens": {
      "--dsw-alias-bg-base": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#fff",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-bg-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-document-selection": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "resolvedLight": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "resolvedDark": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-layer-1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-875)",
        "resolvedLight": "#fff",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-bg-layer-2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-bg-layer-3": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-mask-1": {
        "category": "alias",
        "light": "#0000003d",
        "dark": "#00000080",
        "resolvedLight": "#0000003d",
        "resolvedDark": "#00000080",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-alias-bg-mask-2": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#0003",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#0003",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-3": {
        "category": "alias",
        "light": "#0000007a",
        "dark": "#0000007a",
        "resolvedLight": "#0000007a",
        "resolvedDark": "#0000007a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-drop": {
        "category": "alias",
        "light": "#ffffffb3",
        "dark": "#272730b3",
        "resolvedLight": "#ffffffb3",
        "resolvedDark": "#272730b3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-bg-mask-photo": {
        "category": "alias",
        "light": "#000000e0",
        "dark": "#000000e0",
        "resolvedLight": "#000000e0",
        "resolvedDark": "#000000e0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-module-platform": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-bg-multi-select": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-overlay": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-bg-skeleton": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff14",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-border-inverted": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-commands",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-border-inverted2": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff14",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-border-l1": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff1f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2-darkmode-thin": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-border-l3": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#ffffff29",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#ffffff29",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-layout",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-border-l4": {
        "category": "alias",
        "light": "#00000029",
        "dark": "#fff3",
        "resolvedLight": "#00000029",
        "resolvedDark": "#fff3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-brand-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-brand-primary-invert": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-brand-primary-new-colorprimary-new-color": {
        "category": "alias",
        "light": "#4176e6",
        "dark": "var(--dsw-static-deepseek-450)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-brand-text": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-contrast-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-button-elevated-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#fff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-button-floating-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-plan",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-floating-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-ghost-active-border": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-500)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#979da6",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-info-fill": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-button-info-hover": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-400)",
        "dark": "var(--dsw-static-deepseek-500)",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-button-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-primary-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-brand-primary)",
        "dark": "var(--dsw-alias-brand-primary)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-primary-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-750)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#43454a",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-tool-bar-fill": {
        "category": "alias",
        "light": "#54555780",
        "dark": "#54555780",
        "resolvedLight": "#54555780",
        "resolvedDark": "#54555780",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-fill-invisible": {
        "category": "alias",
        "light": "#1f1f1f5c",
        "dark": "#1f1f1f5c",
        "resolvedLight": "#1f1f1f5c",
        "resolvedDark": "#1f1f1f5c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-hover": {
        "category": "alias",
        "light": "#54555799",
        "dark": "#54555799",
        "resolvedLight": "#54555799",
        "resolvedDark": "#54555799",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-added": {
        "category": "alias",
        "light": "var(--dsw-static-green-500-a08)",
        "dark": "var(--dsw-static-green-500-a12)",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-deleted": {
        "category": "alias",
        "light": "var(--dsw-static-red-600-a08)",
        "dark": "var(--dsw-static-red-400-a12)",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-file-diff-added-bg": {
        "category": "alias",
        "light": "#e6f4e7",
        "dark": "#1f3124",
        "resolvedLight": "#e6f4e7",
        "resolvedDark": "#1f3124",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-gutter": {
        "category": "alias",
        "light": "#edf7ed",
        "dark": "#132016",
        "resolvedLight": "#edf7ed",
        "resolvedDark": "#132016",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-marker": {
        "category": "alias",
        "light": "#01a241",
        "dark": "#41c977",
        "resolvedLight": "#01a241",
        "resolvedDark": "#41c977",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-bg": {
        "category": "alias",
        "light": "#fce6e2",
        "dark": "#3c1f1b",
        "resolvedLight": "#fce6e2",
        "resolvedDark": "#3c1f1b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-gutter": {
        "category": "alias",
        "light": "#fdece9",
        "dark": "#28130e",
        "resolvedLight": "#fdece9",
        "resolvedDark": "#28130e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-marker": {
        "category": "alias",
        "light": "#ba2723",
        "dark": "#fa423e",
        "resolvedLight": "#ba2723",
        "resolvedDark": "#fa423e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-interactive-bg-active": {
        "category": "alias",
        "light": "#2631481a",
        "dark": "#ffffff24",
        "resolvedLight": "#2631481a",
        "resolvedDark": "#ffffff24",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-interactive-bg-hover": {
        "category": "alias",
        "light": "#2631480f",
        "dark": "#ffffff14",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-interactive-bg-hover-accent": {
        "category": "alias",
        "light": "#26314824",
        "dark": "#ffffff3d",
        "resolvedLight": "#26314824",
        "resolvedDark": "#ffffff3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-interactive-bg-hover-danger": {
        "category": "alias",
        "light": "#ec13130d",
        "dark": "#f25a5a26",
        "resolvedLight": "#ec13130d",
        "resolvedDark": "#f25a5a26",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-interactive-bg-hover-solid": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-label-caption": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-400)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-label-deep-diving": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 70%, #172554)",
        "resolvedDark": "color-mix(in srgb, #5686fe 55%, #adb2b8)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-deep-diving-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 30%, #172554)",
        "resolvedDark": "color-mix(in srgb, #93c5fd 65%, #7aaaff)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-label-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-label-primary-bluish": {
        "category": "alias",
        "light": "var(--dsw-static-blue-900)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-label-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-950)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#151517",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-label-primary-foreground": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-1000)",
        "resolvedLight": "#fff",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-label-primary-inverted": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-sidebar"
        ]
      },
      "--dsw-alias-label-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector",
          "dsh-session-log-export"
        ]
      },
      "--dsw-alias-label-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
        "resolvedLight": "color-mix(in srgb, #000 30%, transparent)",
        "resolvedDark": "color-mix(in srgb, #fff 45%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-600)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#81858c",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-link": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-markdown-citation": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block-banner": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-skill"
        ]
      },
      "--dsw-alias-markdown-code-segment-selected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-code-segment-unselected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-inline-code": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-50)",
        "dark": "var(--dsw-static-neutral-800)",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-placeholder": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-tag": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-group-header-fill": {
        "category": "alias",
        "light": "#f8f9faf0",
        "dark": "#303136f0",
        "resolvedLight": "#f8f9faf0",
        "resolvedDark": "#303136f0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-icon": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-alias-label-primary-dimmed)",
        "resolvedLight": "#353638",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-accent": {
        "category": "alias",
        "light": "#3964fe",
        "dark": "#3964fe",
        "resolvedLight": "#3964fe",
        "resolvedDark": "#3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-card-fill": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 80%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-bluish-850) 80%, transparent)",
        "resolvedLight": "color-mix(in srgb, #fff 80%, transparent)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e 80%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-checkbox-border": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-1000) 20%, transparent)",
        "dark": "var(--dsw-alias-border-l2)",
        "resolvedLight": "color-mix(in srgb, #0f1115 20%, transparent)",
        "resolvedDark": "#0000001a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-secondary-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "#48494c",
        "resolvedLight": "#fff",
        "resolvedDark": "#48494c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-scrollbar-bg-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-700)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-bg-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-scrollbar-hover-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-hover-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-550)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-settings-card-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-bg-layer-2)",
        "dark": "var(--dsw-alias-bg-layer-2)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-settings-card-stroke": {
        "category": "alias",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l4)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#00000029",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-state-business-primary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-state-business-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-deepseek-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-plan",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-error-primary": {
        "category": "alias",
        "light": "var(--dsw-static-red-600)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-error-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-red-400)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-idle-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-state-success-primary": {
        "category": "alias",
        "light": "var(--dsw-static-green-500)",
        "dark": "var(--dsw-static-green-500)",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-success-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-green-400)",
        "dark": "var(--dsw-static-green-400)",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-success-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-green-100)",
        "dark": "var(--dsw-static-green-900)",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-label": {
        "category": "alias",
        "light": "var(--dsw-static-amber-600)",
        "dark": "var(--dsw-static-amber-600)",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-primary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-500)",
        "dark": "var(--dsw-static-amber-500)",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-chat",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-tool",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-state-warn-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-400)",
        "dark": "var(--dsw-static-amber-400)",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-warn-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-100)",
        "dark": "var(--dsw-static-amber-900)",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-switch-thumb": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#fff",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#353638",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-label": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-00)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-tooltip-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-850)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-tooltip-key-bg": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "dark": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "resolvedLight": "color-mix(in srgb, #2c2c2e, white 18%)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e, white 18%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-turn-trigger-bg": {
        "category": "alias",
        "light": "var(--dsw-alias-markdown-code-block)",
        "dark": "var(--dsw-alias-interactive-bg-hover)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2631480f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-turn-trigger-bg-hover": {
        "category": "alias",
        "light": "var(--dsw-alias-interactive-bg-hover)",
        "dark": "var(--dsw-alias-interactive-bg-active)",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#2631481a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-corner-shape": {
        "category": "radius",
        "light": "superellipse(1.5)",
        "dark": "superellipse(1.5)",
        "resolvedLight": "superellipse(1.5)",
        "resolvedDark": "superellipse(1.5)",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-elevation-panel": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-prominent": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-soft": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "dark": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedLight": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedDark": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-elevation-stroke": {
        "category": "elevation",
        "light": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "dark": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "resolvedLight": "0 0 0 .5px #00000029",
        "resolvedDark": "0 0 0 .5px #00000029",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-stroke-color": {
        "category": "elevation",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l3)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#0000001f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme] [data-menu-material]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-focus-ring-color": {
        "category": "focus",
        "light": "transparent",
        "dark": "transparent",
        "resolvedLight": "transparent",
        "resolvedDark": "transparent",
        "selector": "html[data-input-modality=pointer] body :focus-visible:not(:read-write)",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-focus-ring-width": {
        "category": "focus",
        "light": "2px",
        "dark": "2px",
        "resolvedLight": "2px",
        "resolvedDark": "2px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-font-base-16": {
        "category": "font",
        "light": "16px/24px var(--dsw-font-family)",
        "dark": "16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16": {
        "category": "font",
        "light": "500 16px/24px var(--dsw-font-family)",
        "dark": "500 16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-family": {
        "category": "font",
        "light": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "dark": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-family-brand": {
        "category": "font",
        "light": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "dark": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-font-l-20": {
        "category": "font",
        "light": "500 20px/28px var(--dsw-font-family)",
        "dark": "500 20px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-l-20-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-size": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18": {
        "category": "font",
        "light": "500 16px/28px var(--dsw-font-family)",
        "dark": "500 16px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic": {
        "category": "font",
        "light": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic": {
        "category": "font",
        "light": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-code-block-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-font-markdown-code-block-small-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-line-height": {
        "category": "font",
        "light": "calc(16px + var(--dsh-code-font-delta))",
        "dark": "calc(16px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-size": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta))",
        "dark": "calc(12px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1": {
        "category": "font",
        "light": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-size": {
        "category": "font",
        "light": "calc(21px + var(--dsh-content-font-delta))",
        "dark": "calc(21px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-line-height": {
        "category": "font",
        "light": "calc(30px + var(--dsh-content-font-delta))",
        "dark": "calc(30px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2": {
        "category": "font",
        "light": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-size": {
        "category": "font",
        "light": "calc(19px + var(--dsh-content-font-delta))",
        "dark": "calc(19px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-line-height": {
        "category": "font",
        "light": "calc(28px + var(--dsh-content-font-delta))",
        "dark": "calc(28px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3": {
        "category": "font",
        "light": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-size": {
        "category": "font",
        "light": "calc(18px + var(--dsh-content-font-delta))",
        "dark": "calc(18px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-line-height": {
        "category": "font",
        "light": "calc(26px + var(--dsh-content-font-delta))",
        "dark": "calc(26px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small": {
        "category": "font",
        "light": "12px/20px var(--dsw-font-family)",
        "dark": "12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-small-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic": {
        "category": "font",
        "light": "italic 12px/20px var(--dsw-font-family)",
        "dark": "italic 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong": {
        "category": "font",
        "light": "600 12px/20px var(--dsw-font-family)",
        "dark": "600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic": {
        "category": "font",
        "light": "italic 600 12px/20px var(--dsw-font-family)",
        "dark": "italic 600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head": {
        "category": "font",
        "light": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14": {
        "category": "font",
        "light": "14px/22px var(--dsw-font-family)",
        "dark": "14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-s-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14": {
        "category": "font",
        "light": "500 14px/22px var(--dsw-font-family)",
        "dark": "500 14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24": {
        "category": "font",
        "light": "600 24px/32px var(--dsw-font-family)",
        "dark": "600 24px/32px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-size": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-line-height": {
        "category": "font",
        "light": "32px",
        "dark": "32px",
        "resolvedLight": "32px",
        "resolvedDark": "32px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13": {
        "category": "font",
        "light": "13px/20px var(--dsw-font-family)",
        "dark": "13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13": {
        "category": "font",
        "light": "500 13px/20px var(--dsw-font-family)",
        "dark": "500 13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-strong-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12": {
        "category": "font",
        "light": "12px/18px var(--dsw-font-family)",
        "dark": "12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxs-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12": {
        "category": "font",
        "light": "500 12px/18px var(--dsw-font-family)",
        "dark": "500 12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11": {
        "category": "font",
        "light": "11px/14px var(--dsw-font-family)",
        "dark": "11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxxs-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11": {
        "category": "font",
        "light": "500 11px/14px var(--dsw-font-family)",
        "dark": "500 11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-gradient-onboarding-blue-stops": {
        "category": "other",
        "light": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "dark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedLight": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedDark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-cyan-stops": {
        "category": "other",
        "light": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "dark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedLight": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedDark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-violet-stops": {
        "category": "other",
        "light": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "dark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedLight": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedDark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-linear-gradient-think": {
        "category": "other",
        "light": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "dark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "resolvedLight": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "resolvedDark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-linear-think-select": {
        "category": "other",
        "light": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "dark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "resolvedLight": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "resolvedDark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-mask-blur": {
        "category": "other",
        "light": "none",
        "dark": "none",
        "resolvedLight": "none",
        "resolvedDark": "none",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-menu-backdrop-filter": {
        "category": "other",
        "light": "blur(40px) saturate(150%)",
        "dark": "blur(40px) saturate(150%)",
        "resolvedLight": "blur(40px) saturate(150%)",
        "resolvedDark": "blur(40px) saturate(150%)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-menu-surface-fill": {
        "category": "other",
        "light": "#f8f9fa94",
        "dark": "#43454a73",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#43454a73",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-radius-lg": {
        "category": "radius",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-md": {
        "category": "radius",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-radius-panel": {
        "category": "radius",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-radius-sm": {
        "category": "radius",
        "light": "8px",
        "dark": "8px",
        "resolvedLight": "8px",
        "resolvedDark": "8px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-xl": {
        "category": "radius",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-radius-xs": {
        "category": "radius",
        "light": "4px",
        "dark": "4px",
        "resolvedLight": "4px",
        "resolvedDark": "4px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-shadow-lv1": {
        "category": "shadow",
        "light": "0 2px 4px 0 #0000000d",
        "dark": "0 2px 4px 0 #0000000d",
        "resolvedLight": "0 2px 4px 0 #0000000d",
        "resolvedDark": "0 2px 4px 0 #0000000d",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv1-blur": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005",
        "dark": "0 4px 12px 0 #00000005",
        "resolvedLight": "0 4px 12px 0 #00000005",
        "resolvedDark": "0 4px 12px 0 #00000005",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv2": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "dark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedLight": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedDark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval"
        ]
      },
      "--dsw-shadow-lv3": {
        "category": "shadow",
        "light": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "dark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedLight": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedDark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-specific-bubble": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-bubble-highlight": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-specific-input-major": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-login-input": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-specific-menu": {
        "category": "specific",
        "light": "var(--dsw-menu-surface-fill)",
        "dark": "var(--dsw-menu-surface-fill)",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#f8f9fa94",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-specific-selector": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-specific-sidebar-fill": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active-accent": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-sidebar-nav-item-hover": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-tip": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-static-amber-100": {
        "category": "static",
        "light": "#fef5e7",
        "dark": "#fef5e7",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#fef5e7",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-400": {
        "category": "static",
        "light": "#f7ad31",
        "dark": "#f7ad31",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-500": {
        "category": "static",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-600": {
        "category": "static",
        "light": "#dd8629",
        "dark": "#dd8629",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-900": {
        "category": "static",
        "light": "#27241f",
        "dark": "#27241f",
        "resolvedLight": "#27241f",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-100": {
        "category": "static",
        "light": "#dbeafe",
        "dark": "#dbeafe",
        "resolvedLight": "#dbeafe",
        "resolvedDark": "#dbeafe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-300": {
        "category": "static",
        "light": "#93c5fd",
        "dark": "#93c5fd",
        "resolvedLight": "#93c5fd",
        "resolvedDark": "#93c5fd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-400": {
        "category": "static",
        "light": "#60a5fa",
        "dark": "#60a5fa",
        "resolvedLight": "#60a5fa",
        "resolvedDark": "#60a5fa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-450": {
        "category": "static",
        "light": "#4d93f8",
        "dark": "#4d93f8",
        "resolvedLight": "#4d93f8",
        "resolvedDark": "#4d93f8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-static-blue-50": {
        "category": "static",
        "light": "#eff6ff",
        "dark": "#eff6ff",
        "resolvedLight": "#eff6ff",
        "resolvedDark": "#eff6ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-500": {
        "category": "static",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "resolvedLight": "#3b82f6",
        "resolvedDark": "#3b82f6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-static-blue-50p": {
        "category": "static",
        "light": "#eaf3ff",
        "dark": "#eaf3ff",
        "resolvedLight": "#eaf3ff",
        "resolvedDark": "#eaf3ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-600": {
        "category": "static",
        "light": "#2563eb",
        "dark": "#2563eb",
        "resolvedLight": "#2563eb",
        "resolvedDark": "#2563eb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-75": {
        "category": "static",
        "light": "#e5f0ff",
        "dark": "#e5f0ff",
        "resolvedLight": "#e5f0ff",
        "resolvedDark": "#e5f0ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-800": {
        "category": "static",
        "light": "#1e40af",
        "dark": "#1e40af",
        "resolvedLight": "#1e40af",
        "resolvedDark": "#1e40af",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-900": {
        "category": "static",
        "light": "#0e3074",
        "dark": "#0e3074",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#0e3074",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-950": {
        "category": "static",
        "light": "#172554",
        "dark": "#172554",
        "resolvedLight": "#172554",
        "resolvedDark": "#172554",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-100": {
        "category": "static",
        "light": "#e4edfd",
        "dark": "#e4edfd",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#e4edfd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-200": {
        "category": "static",
        "light": "#d3e2ff",
        "dark": "#d3e2ff",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#d3e2ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-300": {
        "category": "static",
        "light": "#b7c8fe",
        "dark": "#b7c8fe",
        "resolvedLight": "#b7c8fe",
        "resolvedDark": "#b7c8fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-400": {
        "category": "static",
        "light": "#7aaaff",
        "dark": "#7aaaff",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-450": {
        "category": "static",
        "light": "#5686fe",
        "dark": "#5686fe",
        "resolvedLight": "#5686fe",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-50": {
        "category": "static",
        "light": "#edf3fe",
        "dark": "#edf3fe",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#edf3fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-500": {
        "category": "static",
        "light": "#4176e6",
        "dark": "#4176e6",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-600": {
        "category": "static",
        "light": "#4868b2",
        "dark": "#4868b2",
        "resolvedLight": "#4868b2",
        "resolvedDark": "#4868b2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-700-delete": {
        "category": "static",
        "light": "#2f4c8f",
        "dark": "#2f4c8f",
        "resolvedLight": "#2f4c8f",
        "resolvedDark": "#2f4c8f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-800": {
        "category": "static",
        "light": "#34415b",
        "dark": "#34415b",
        "resolvedLight": "#34415b",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-900": {
        "category": "static",
        "light": "#283142",
        "dark": "#283142",
        "resolvedLight": "#283142",
        "resolvedDark": "#283142",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-green-100": {
        "category": "static",
        "light": "#e6faed",
        "dark": "#e6faed",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#e6faed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-400": {
        "category": "static",
        "light": "#4ed17e",
        "dark": "#4ed17e",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500": {
        "category": "static",
        "light": "#22c55e",
        "dark": "#22c55e",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a08": {
        "category": "static",
        "light": "#22c55e14",
        "dark": "#22c55e14",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a12": {
        "category": "static",
        "light": "#22c55e1f",
        "dark": "#22c55e1f",
        "resolvedLight": "#22c55e1f",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-900": {
        "category": "static",
        "light": "#233c2c",
        "dark": "#233c2c",
        "resolvedLight": "#233c2c",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-100": {
        "category": "static",
        "light": "#f5f5f5",
        "dark": "#f5f5f5",
        "resolvedLight": "#f5f5f5",
        "resolvedDark": "#f5f5f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-static-neutral-1000": {
        "category": "static",
        "light": "#000",
        "dark": "#000",
        "resolvedLight": "#000",
        "resolvedDark": "#000",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-150": {
        "category": "static",
        "light": "#ededed",
        "dark": "#ededed",
        "resolvedLight": "#ededed",
        "resolvedDark": "#ededed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-200": {
        "category": "static",
        "light": "#e5e5e5",
        "dark": "#e5e5e5",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#e5e5e5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-250": {
        "category": "static",
        "light": "#dcdcdc",
        "dark": "#dcdcdc",
        "resolvedLight": "#dcdcdc",
        "resolvedDark": "#dcdcdc",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-300": {
        "category": "static",
        "light": "#d4d4d4",
        "dark": "#d4d4d4",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#d4d4d4",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-400": {
        "category": "static",
        "light": "#a2a4a6",
        "dark": "#a2a4a6",
        "resolvedLight": "#a2a4a6",
        "resolvedDark": "#a2a4a6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-50": {
        "category": "static",
        "light": "#fafafa",
        "dark": "#fafafa",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#fafafa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-500": {
        "category": "static",
        "light": "#7f8287",
        "dark": "#7f8287",
        "resolvedLight": "#7f8287",
        "resolvedDark": "#7f8287",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-550": {
        "category": "static",
        "light": "#65676b",
        "dark": "#65676b",
        "resolvedLight": "#65676b",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-600": {
        "category": "static",
        "light": "#545557",
        "dark": "#545557",
        "resolvedLight": "#545557",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-700": {
        "category": "static",
        "light": "#3c3c3d",
        "dark": "#3c3c3d",
        "resolvedLight": "#3c3c3d",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-800": {
        "category": "static",
        "light": "#292929",
        "dark": "#292929",
        "resolvedLight": "#292929",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-850": {
        "category": "static",
        "light": "#212123",
        "dark": "#212123",
        "resolvedLight": "#212123",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-900": {
        "category": "static",
        "light": "#0f0f0f",
        "dark": "#0f0f0f",
        "resolvedLight": "#0f0f0f",
        "resolvedDark": "#0f0f0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-bluish-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-100": {
        "category": "static",
        "light": "#ebeef2",
        "dark": "#ebeef2",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-1000": {
        "category": "static",
        "light": "#0f1115",
        "dark": "#0f1115",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-150": {
        "category": "static",
        "light": "#e9ecf2",
        "dark": "#e9ecf2",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#e9ecf2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-200": {
        "category": "static",
        "light": "#e1e5ee",
        "dark": "#e1e5ee",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#e1e5ee",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-300": {
        "category": "static",
        "light": "#cfd3d6",
        "dark": "#cfd3d6",
        "resolvedLight": "#cfd3d6",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-400": {
        "category": "static",
        "light": "#adb2b8",
        "dark": "#adb2b8",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-50": {
        "category": "static",
        "light": "#f9fafb",
        "dark": "#f9fafb",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-500": {
        "category": "static",
        "light": "#979da6",
        "dark": "#979da6",
        "resolvedLight": "#979da6",
        "resolvedDark": "#979da6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-60": {
        "category": "static",
        "light": "#f5f6f7",
        "dark": "#f9fafb",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-600": {
        "category": "static",
        "light": "#81858c",
        "dark": "#81858c",
        "resolvedLight": "#81858c",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-700": {
        "category": "static",
        "light": "#61666b",
        "dark": "#61666b",
        "resolvedLight": "#61666b",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-75": {
        "category": "static",
        "light": "#f1f3f5",
        "dark": "#f1f3f5",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#f1f3f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-750": {
        "category": "static",
        "light": "#43454a",
        "dark": "#43454a",
        "resolvedLight": "#43454a",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-800": {
        "category": "static",
        "light": "#353638",
        "dark": "#353638",
        "resolvedLight": "#353638",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-850": {
        "category": "static",
        "light": "#2c2c2e",
        "dark": "#2c2c2e",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-875": {
        "category": "static",
        "light": "#232324",
        "dark": "#232324",
        "resolvedLight": "#232324",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-900": {
        "category": "static",
        "light": "#1b1b1c",
        "dark": "#1b1b1c",
        "resolvedLight": "#1b1b1c",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-950": {
        "category": "static",
        "light": "#151517",
        "dark": "#151517",
        "resolvedLight": "#151517",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-100": {
        "category": "static",
        "light": "#fee2e2",
        "dark": "#fee2e2",
        "resolvedLight": "#fee2e2",
        "resolvedDark": "#fee2e2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-400": {
        "category": "static",
        "light": "#f25a5a",
        "dark": "#f25a5a",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-400-a12": {
        "category": "static",
        "light": "#f25a5a1f",
        "dark": "#f25a5a1f",
        "resolvedLight": "#f25a5a1f",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-50": {
        "category": "static",
        "light": "#fef2f2",
        "dark": "#fef2f2",
        "resolvedLight": "#fef2f2",
        "resolvedDark": "#fef2f2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-500": {
        "category": "static",
        "light": "#ef4444",
        "dark": "#ef4444",
        "resolvedLight": "#ef4444",
        "resolvedDark": "#ef4444",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-600": {
        "category": "static",
        "light": "#ec1313",
        "dark": "#ec1313",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#ec1313",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-600-a08": {
        "category": "static",
        "light": "#ec131314",
        "dark": "#ec131314",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#ec131314",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-900": {
        "category": "static",
        "light": "#570c0c",
        "dark": "#570c0c",
        "resolvedLight": "#570c0c",
        "resolvedDark": "#570c0c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      }
    },
    "dshVariables": {
      "--dsh-code-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-size-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-code-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-text-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-border": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-hover": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-track-margin": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-width": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      }
    }
  },
  "0.2.1-rc.3": {
    "version": "0.2.1-rc.3",
    "tokenContractHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "tokens": {
      "--dsw-alias-bg-base": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#fff",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-bg-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-document-selection": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "resolvedLight": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "resolvedDark": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-layer-1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-875)",
        "resolvedLight": "#fff",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-bg-layer-2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-bg-layer-3": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-mask-1": {
        "category": "alias",
        "light": "#0000003d",
        "dark": "#00000080",
        "resolvedLight": "#0000003d",
        "resolvedDark": "#00000080",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-alias-bg-mask-2": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#0003",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#0003",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-3": {
        "category": "alias",
        "light": "#0000007a",
        "dark": "#0000007a",
        "resolvedLight": "#0000007a",
        "resolvedDark": "#0000007a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-drop": {
        "category": "alias",
        "light": "#ffffffb3",
        "dark": "#272730b3",
        "resolvedLight": "#ffffffb3",
        "resolvedDark": "#272730b3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-bg-mask-photo": {
        "category": "alias",
        "light": "#000000e0",
        "dark": "#000000e0",
        "resolvedLight": "#000000e0",
        "resolvedDark": "#000000e0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-module-platform": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-bg-multi-select": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-overlay": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-bg-skeleton": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff14",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-border-inverted": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-commands",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-border-inverted2": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff14",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-border-l1": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff1f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2-darkmode-thin": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-border-l3": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#ffffff29",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#ffffff29",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-layout",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-border-l4": {
        "category": "alias",
        "light": "#00000029",
        "dark": "#fff3",
        "resolvedLight": "#00000029",
        "resolvedDark": "#fff3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-brand-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-brand-primary-invert": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-brand-primary-new-colorprimary-new-color": {
        "category": "alias",
        "light": "#4176e6",
        "dark": "var(--dsw-static-deepseek-450)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-brand-text": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-contrast-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-button-elevated-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#fff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-button-floating-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-plan",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-floating-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-ghost-active-border": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-500)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#979da6",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-info-fill": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-button-info-hover": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-400)",
        "dark": "var(--dsw-static-deepseek-500)",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-button-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-primary-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-brand-primary)",
        "dark": "var(--dsw-alias-brand-primary)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-primary-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-750)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#43454a",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-tool-bar-fill": {
        "category": "alias",
        "light": "#54555780",
        "dark": "#54555780",
        "resolvedLight": "#54555780",
        "resolvedDark": "#54555780",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-fill-invisible": {
        "category": "alias",
        "light": "#1f1f1f5c",
        "dark": "#1f1f1f5c",
        "resolvedLight": "#1f1f1f5c",
        "resolvedDark": "#1f1f1f5c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-hover": {
        "category": "alias",
        "light": "#54555799",
        "dark": "#54555799",
        "resolvedLight": "#54555799",
        "resolvedDark": "#54555799",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-added": {
        "category": "alias",
        "light": "var(--dsw-static-green-500-a08)",
        "dark": "var(--dsw-static-green-500-a12)",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-deleted": {
        "category": "alias",
        "light": "var(--dsw-static-red-600-a08)",
        "dark": "var(--dsw-static-red-400-a12)",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-file-diff-added-bg": {
        "category": "alias",
        "light": "#e6f4e7",
        "dark": "#1f3124",
        "resolvedLight": "#e6f4e7",
        "resolvedDark": "#1f3124",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-gutter": {
        "category": "alias",
        "light": "#edf7ed",
        "dark": "#132016",
        "resolvedLight": "#edf7ed",
        "resolvedDark": "#132016",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-marker": {
        "category": "alias",
        "light": "#01a241",
        "dark": "#41c977",
        "resolvedLight": "#01a241",
        "resolvedDark": "#41c977",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-bg": {
        "category": "alias",
        "light": "#fce6e2",
        "dark": "#3c1f1b",
        "resolvedLight": "#fce6e2",
        "resolvedDark": "#3c1f1b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-gutter": {
        "category": "alias",
        "light": "#fdece9",
        "dark": "#28130e",
        "resolvedLight": "#fdece9",
        "resolvedDark": "#28130e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-marker": {
        "category": "alias",
        "light": "#ba2723",
        "dark": "#fa423e",
        "resolvedLight": "#ba2723",
        "resolvedDark": "#fa423e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-interactive-bg-active": {
        "category": "alias",
        "light": "#2631481a",
        "dark": "#ffffff24",
        "resolvedLight": "#2631481a",
        "resolvedDark": "#ffffff24",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-interactive-bg-hover": {
        "category": "alias",
        "light": "#2631480f",
        "dark": "#ffffff14",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-interactive-bg-hover-accent": {
        "category": "alias",
        "light": "#26314824",
        "dark": "#ffffff3d",
        "resolvedLight": "#26314824",
        "resolvedDark": "#ffffff3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-interactive-bg-hover-danger": {
        "category": "alias",
        "light": "#ec13130d",
        "dark": "#f25a5a26",
        "resolvedLight": "#ec13130d",
        "resolvedDark": "#f25a5a26",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-interactive-bg-hover-solid": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-label-caption": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-400)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-label-deep-diving": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 70%, #172554)",
        "resolvedDark": "color-mix(in srgb, #5686fe 55%, #adb2b8)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-deep-diving-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 30%, #172554)",
        "resolvedDark": "color-mix(in srgb, #93c5fd 65%, #7aaaff)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-label-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-label-primary-bluish": {
        "category": "alias",
        "light": "var(--dsw-static-blue-900)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-label-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-950)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#151517",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-label-primary-foreground": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-1000)",
        "resolvedLight": "#fff",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-label-primary-inverted": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-sidebar"
        ]
      },
      "--dsw-alias-label-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector",
          "dsh-session-log-export"
        ]
      },
      "--dsw-alias-label-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
        "resolvedLight": "color-mix(in srgb, #000 30%, transparent)",
        "resolvedDark": "color-mix(in srgb, #fff 45%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-600)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#81858c",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-link": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-markdown-citation": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block-banner": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-skill"
        ]
      },
      "--dsw-alias-markdown-code-segment-selected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-code-segment-unselected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-inline-code": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-50)",
        "dark": "var(--dsw-static-neutral-800)",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-placeholder": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-tag": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-group-header-fill": {
        "category": "alias",
        "light": "#f8f9faf0",
        "dark": "#303136f0",
        "resolvedLight": "#f8f9faf0",
        "resolvedDark": "#303136f0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-icon": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-alias-label-primary-dimmed)",
        "resolvedLight": "#353638",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-accent": {
        "category": "alias",
        "light": "#3964fe",
        "dark": "#3964fe",
        "resolvedLight": "#3964fe",
        "resolvedDark": "#3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-card-fill": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 80%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-bluish-850) 80%, transparent)",
        "resolvedLight": "color-mix(in srgb, #fff 80%, transparent)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e 80%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-checkbox-border": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-1000) 20%, transparent)",
        "dark": "var(--dsw-alias-border-l2)",
        "resolvedLight": "color-mix(in srgb, #0f1115 20%, transparent)",
        "resolvedDark": "#0000001a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-secondary-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "#48494c",
        "resolvedLight": "#fff",
        "resolvedDark": "#48494c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-scrollbar-bg-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-700)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-bg-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-scrollbar-hover-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-hover-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-550)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-settings-card-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-bg-layer-2)",
        "dark": "var(--dsw-alias-bg-layer-2)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-settings-card-stroke": {
        "category": "alias",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l4)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#00000029",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-state-business-primary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-state-business-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-deepseek-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-plan",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-error-primary": {
        "category": "alias",
        "light": "var(--dsw-static-red-600)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-error-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-red-400)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-idle-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-state-success-primary": {
        "category": "alias",
        "light": "var(--dsw-static-green-500)",
        "dark": "var(--dsw-static-green-500)",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-success-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-green-400)",
        "dark": "var(--dsw-static-green-400)",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-success-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-green-100)",
        "dark": "var(--dsw-static-green-900)",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-label": {
        "category": "alias",
        "light": "var(--dsw-static-amber-600)",
        "dark": "var(--dsw-static-amber-600)",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-primary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-500)",
        "dark": "var(--dsw-static-amber-500)",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-chat",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-tool",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-state-warn-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-400)",
        "dark": "var(--dsw-static-amber-400)",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-warn-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-100)",
        "dark": "var(--dsw-static-amber-900)",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-switch-thumb": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#fff",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#353638",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-label": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-00)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-tooltip-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-850)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-tooltip-key-bg": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "dark": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "resolvedLight": "color-mix(in srgb, #2c2c2e, white 18%)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e, white 18%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-turn-trigger-bg": {
        "category": "alias",
        "light": "var(--dsw-alias-markdown-code-block)",
        "dark": "var(--dsw-alias-interactive-bg-hover)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2631480f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-turn-trigger-bg-hover": {
        "category": "alias",
        "light": "var(--dsw-alias-interactive-bg-hover)",
        "dark": "var(--dsw-alias-interactive-bg-active)",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#2631481a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-corner-shape": {
        "category": "radius",
        "light": "superellipse(1.5)",
        "dark": "superellipse(1.5)",
        "resolvedLight": "superellipse(1.5)",
        "resolvedDark": "superellipse(1.5)",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-elevation-panel": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-prominent": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-soft": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "dark": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedLight": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedDark": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-elevation-stroke": {
        "category": "elevation",
        "light": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "dark": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "resolvedLight": "0 0 0 .5px #00000029",
        "resolvedDark": "0 0 0 .5px #00000029",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-stroke-color": {
        "category": "elevation",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l3)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#0000001f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme] [data-menu-material]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-focus-ring-color": {
        "category": "focus",
        "light": "transparent",
        "dark": "transparent",
        "resolvedLight": "transparent",
        "resolvedDark": "transparent",
        "selector": "html[data-input-modality=pointer] body :focus-visible:not(:read-write)",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-focus-ring-width": {
        "category": "focus",
        "light": "2px",
        "dark": "2px",
        "resolvedLight": "2px",
        "resolvedDark": "2px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-font-base-16": {
        "category": "font",
        "light": "16px/24px var(--dsw-font-family)",
        "dark": "16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16": {
        "category": "font",
        "light": "500 16px/24px var(--dsw-font-family)",
        "dark": "500 16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-family": {
        "category": "font",
        "light": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "dark": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-family-brand": {
        "category": "font",
        "light": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "dark": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-font-l-20": {
        "category": "font",
        "light": "500 20px/28px var(--dsw-font-family)",
        "dark": "500 20px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-l-20-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-size": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18": {
        "category": "font",
        "light": "500 16px/28px var(--dsw-font-family)",
        "dark": "500 16px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic": {
        "category": "font",
        "light": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic": {
        "category": "font",
        "light": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-code-block-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-font-markdown-code-block-small-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-line-height": {
        "category": "font",
        "light": "calc(16px + var(--dsh-code-font-delta))",
        "dark": "calc(16px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-size": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta))",
        "dark": "calc(12px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1": {
        "category": "font",
        "light": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-size": {
        "category": "font",
        "light": "calc(21px + var(--dsh-content-font-delta))",
        "dark": "calc(21px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-line-height": {
        "category": "font",
        "light": "calc(30px + var(--dsh-content-font-delta))",
        "dark": "calc(30px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2": {
        "category": "font",
        "light": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-size": {
        "category": "font",
        "light": "calc(19px + var(--dsh-content-font-delta))",
        "dark": "calc(19px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-line-height": {
        "category": "font",
        "light": "calc(28px + var(--dsh-content-font-delta))",
        "dark": "calc(28px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3": {
        "category": "font",
        "light": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-size": {
        "category": "font",
        "light": "calc(18px + var(--dsh-content-font-delta))",
        "dark": "calc(18px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-line-height": {
        "category": "font",
        "light": "calc(26px + var(--dsh-content-font-delta))",
        "dark": "calc(26px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small": {
        "category": "font",
        "light": "12px/20px var(--dsw-font-family)",
        "dark": "12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-small-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic": {
        "category": "font",
        "light": "italic 12px/20px var(--dsw-font-family)",
        "dark": "italic 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong": {
        "category": "font",
        "light": "600 12px/20px var(--dsw-font-family)",
        "dark": "600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic": {
        "category": "font",
        "light": "italic 600 12px/20px var(--dsw-font-family)",
        "dark": "italic 600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head": {
        "category": "font",
        "light": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14": {
        "category": "font",
        "light": "14px/22px var(--dsw-font-family)",
        "dark": "14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-s-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14": {
        "category": "font",
        "light": "500 14px/22px var(--dsw-font-family)",
        "dark": "500 14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24": {
        "category": "font",
        "light": "600 24px/32px var(--dsw-font-family)",
        "dark": "600 24px/32px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-size": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-line-height": {
        "category": "font",
        "light": "32px",
        "dark": "32px",
        "resolvedLight": "32px",
        "resolvedDark": "32px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13": {
        "category": "font",
        "light": "13px/20px var(--dsw-font-family)",
        "dark": "13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13": {
        "category": "font",
        "light": "500 13px/20px var(--dsw-font-family)",
        "dark": "500 13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-strong-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12": {
        "category": "font",
        "light": "12px/18px var(--dsw-font-family)",
        "dark": "12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxs-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12": {
        "category": "font",
        "light": "500 12px/18px var(--dsw-font-family)",
        "dark": "500 12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11": {
        "category": "font",
        "light": "11px/14px var(--dsw-font-family)",
        "dark": "11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxxs-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11": {
        "category": "font",
        "light": "500 11px/14px var(--dsw-font-family)",
        "dark": "500 11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-gradient-onboarding-blue-stops": {
        "category": "other",
        "light": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "dark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedLight": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedDark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-cyan-stops": {
        "category": "other",
        "light": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "dark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedLight": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedDark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-violet-stops": {
        "category": "other",
        "light": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "dark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedLight": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedDark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-linear-gradient-think": {
        "category": "other",
        "light": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "dark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "resolvedLight": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "resolvedDark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-linear-think-select": {
        "category": "other",
        "light": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "dark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "resolvedLight": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "resolvedDark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-mask-blur": {
        "category": "other",
        "light": "none",
        "dark": "none",
        "resolvedLight": "none",
        "resolvedDark": "none",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-menu-backdrop-filter": {
        "category": "other",
        "light": "blur(40px) saturate(150%)",
        "dark": "blur(40px) saturate(150%)",
        "resolvedLight": "blur(40px) saturate(150%)",
        "resolvedDark": "blur(40px) saturate(150%)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-menu-surface-fill": {
        "category": "other",
        "light": "#f8f9fa94",
        "dark": "#43454a73",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#43454a73",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-radius-lg": {
        "category": "radius",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-md": {
        "category": "radius",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-radius-panel": {
        "category": "radius",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-radius-sm": {
        "category": "radius",
        "light": "8px",
        "dark": "8px",
        "resolvedLight": "8px",
        "resolvedDark": "8px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-xl": {
        "category": "radius",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-radius-xs": {
        "category": "radius",
        "light": "4px",
        "dark": "4px",
        "resolvedLight": "4px",
        "resolvedDark": "4px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-shadow-lv1": {
        "category": "shadow",
        "light": "0 2px 4px 0 #0000000d",
        "dark": "0 2px 4px 0 #0000000d",
        "resolvedLight": "0 2px 4px 0 #0000000d",
        "resolvedDark": "0 2px 4px 0 #0000000d",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv1-blur": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005",
        "dark": "0 4px 12px 0 #00000005",
        "resolvedLight": "0 4px 12px 0 #00000005",
        "resolvedDark": "0 4px 12px 0 #00000005",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv2": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "dark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedLight": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedDark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval"
        ]
      },
      "--dsw-shadow-lv3": {
        "category": "shadow",
        "light": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "dark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedLight": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedDark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-specific-bubble": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-bubble-highlight": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-specific-input-major": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-login-input": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-specific-menu": {
        "category": "specific",
        "light": "var(--dsw-menu-surface-fill)",
        "dark": "var(--dsw-menu-surface-fill)",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#f8f9fa94",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-specific-selector": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-specific-sidebar-fill": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active-accent": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-sidebar-nav-item-hover": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-tip": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-static-amber-100": {
        "category": "static",
        "light": "#fef5e7",
        "dark": "#fef5e7",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#fef5e7",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-400": {
        "category": "static",
        "light": "#f7ad31",
        "dark": "#f7ad31",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-500": {
        "category": "static",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-600": {
        "category": "static",
        "light": "#dd8629",
        "dark": "#dd8629",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-900": {
        "category": "static",
        "light": "#27241f",
        "dark": "#27241f",
        "resolvedLight": "#27241f",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-100": {
        "category": "static",
        "light": "#dbeafe",
        "dark": "#dbeafe",
        "resolvedLight": "#dbeafe",
        "resolvedDark": "#dbeafe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-300": {
        "category": "static",
        "light": "#93c5fd",
        "dark": "#93c5fd",
        "resolvedLight": "#93c5fd",
        "resolvedDark": "#93c5fd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-400": {
        "category": "static",
        "light": "#60a5fa",
        "dark": "#60a5fa",
        "resolvedLight": "#60a5fa",
        "resolvedDark": "#60a5fa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-450": {
        "category": "static",
        "light": "#4d93f8",
        "dark": "#4d93f8",
        "resolvedLight": "#4d93f8",
        "resolvedDark": "#4d93f8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-static-blue-50": {
        "category": "static",
        "light": "#eff6ff",
        "dark": "#eff6ff",
        "resolvedLight": "#eff6ff",
        "resolvedDark": "#eff6ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-500": {
        "category": "static",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "resolvedLight": "#3b82f6",
        "resolvedDark": "#3b82f6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-static-blue-50p": {
        "category": "static",
        "light": "#eaf3ff",
        "dark": "#eaf3ff",
        "resolvedLight": "#eaf3ff",
        "resolvedDark": "#eaf3ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-600": {
        "category": "static",
        "light": "#2563eb",
        "dark": "#2563eb",
        "resolvedLight": "#2563eb",
        "resolvedDark": "#2563eb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-75": {
        "category": "static",
        "light": "#e5f0ff",
        "dark": "#e5f0ff",
        "resolvedLight": "#e5f0ff",
        "resolvedDark": "#e5f0ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-800": {
        "category": "static",
        "light": "#1e40af",
        "dark": "#1e40af",
        "resolvedLight": "#1e40af",
        "resolvedDark": "#1e40af",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-900": {
        "category": "static",
        "light": "#0e3074",
        "dark": "#0e3074",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#0e3074",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-950": {
        "category": "static",
        "light": "#172554",
        "dark": "#172554",
        "resolvedLight": "#172554",
        "resolvedDark": "#172554",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-100": {
        "category": "static",
        "light": "#e4edfd",
        "dark": "#e4edfd",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#e4edfd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-200": {
        "category": "static",
        "light": "#d3e2ff",
        "dark": "#d3e2ff",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#d3e2ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-300": {
        "category": "static",
        "light": "#b7c8fe",
        "dark": "#b7c8fe",
        "resolvedLight": "#b7c8fe",
        "resolvedDark": "#b7c8fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-400": {
        "category": "static",
        "light": "#7aaaff",
        "dark": "#7aaaff",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-450": {
        "category": "static",
        "light": "#5686fe",
        "dark": "#5686fe",
        "resolvedLight": "#5686fe",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-50": {
        "category": "static",
        "light": "#edf3fe",
        "dark": "#edf3fe",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#edf3fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-500": {
        "category": "static",
        "light": "#4176e6",
        "dark": "#4176e6",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-600": {
        "category": "static",
        "light": "#4868b2",
        "dark": "#4868b2",
        "resolvedLight": "#4868b2",
        "resolvedDark": "#4868b2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-700-delete": {
        "category": "static",
        "light": "#2f4c8f",
        "dark": "#2f4c8f",
        "resolvedLight": "#2f4c8f",
        "resolvedDark": "#2f4c8f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-800": {
        "category": "static",
        "light": "#34415b",
        "dark": "#34415b",
        "resolvedLight": "#34415b",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-900": {
        "category": "static",
        "light": "#283142",
        "dark": "#283142",
        "resolvedLight": "#283142",
        "resolvedDark": "#283142",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-green-100": {
        "category": "static",
        "light": "#e6faed",
        "dark": "#e6faed",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#e6faed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-400": {
        "category": "static",
        "light": "#4ed17e",
        "dark": "#4ed17e",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500": {
        "category": "static",
        "light": "#22c55e",
        "dark": "#22c55e",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a08": {
        "category": "static",
        "light": "#22c55e14",
        "dark": "#22c55e14",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a12": {
        "category": "static",
        "light": "#22c55e1f",
        "dark": "#22c55e1f",
        "resolvedLight": "#22c55e1f",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-900": {
        "category": "static",
        "light": "#233c2c",
        "dark": "#233c2c",
        "resolvedLight": "#233c2c",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-100": {
        "category": "static",
        "light": "#f5f5f5",
        "dark": "#f5f5f5",
        "resolvedLight": "#f5f5f5",
        "resolvedDark": "#f5f5f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-static-neutral-1000": {
        "category": "static",
        "light": "#000",
        "dark": "#000",
        "resolvedLight": "#000",
        "resolvedDark": "#000",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-150": {
        "category": "static",
        "light": "#ededed",
        "dark": "#ededed",
        "resolvedLight": "#ededed",
        "resolvedDark": "#ededed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-200": {
        "category": "static",
        "light": "#e5e5e5",
        "dark": "#e5e5e5",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#e5e5e5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-250": {
        "category": "static",
        "light": "#dcdcdc",
        "dark": "#dcdcdc",
        "resolvedLight": "#dcdcdc",
        "resolvedDark": "#dcdcdc",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-300": {
        "category": "static",
        "light": "#d4d4d4",
        "dark": "#d4d4d4",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#d4d4d4",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-400": {
        "category": "static",
        "light": "#a2a4a6",
        "dark": "#a2a4a6",
        "resolvedLight": "#a2a4a6",
        "resolvedDark": "#a2a4a6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-50": {
        "category": "static",
        "light": "#fafafa",
        "dark": "#fafafa",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#fafafa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-500": {
        "category": "static",
        "light": "#7f8287",
        "dark": "#7f8287",
        "resolvedLight": "#7f8287",
        "resolvedDark": "#7f8287",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-550": {
        "category": "static",
        "light": "#65676b",
        "dark": "#65676b",
        "resolvedLight": "#65676b",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-600": {
        "category": "static",
        "light": "#545557",
        "dark": "#545557",
        "resolvedLight": "#545557",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-700": {
        "category": "static",
        "light": "#3c3c3d",
        "dark": "#3c3c3d",
        "resolvedLight": "#3c3c3d",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-800": {
        "category": "static",
        "light": "#292929",
        "dark": "#292929",
        "resolvedLight": "#292929",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-850": {
        "category": "static",
        "light": "#212123",
        "dark": "#212123",
        "resolvedLight": "#212123",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-900": {
        "category": "static",
        "light": "#0f0f0f",
        "dark": "#0f0f0f",
        "resolvedLight": "#0f0f0f",
        "resolvedDark": "#0f0f0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-bluish-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-100": {
        "category": "static",
        "light": "#ebeef2",
        "dark": "#ebeef2",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-1000": {
        "category": "static",
        "light": "#0f1115",
        "dark": "#0f1115",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-150": {
        "category": "static",
        "light": "#e9ecf2",
        "dark": "#e9ecf2",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#e9ecf2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-200": {
        "category": "static",
        "light": "#e1e5ee",
        "dark": "#e1e5ee",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#e1e5ee",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-300": {
        "category": "static",
        "light": "#cfd3d6",
        "dark": "#cfd3d6",
        "resolvedLight": "#cfd3d6",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-400": {
        "category": "static",
        "light": "#adb2b8",
        "dark": "#adb2b8",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-50": {
        "category": "static",
        "light": "#f9fafb",
        "dark": "#f9fafb",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-500": {
        "category": "static",
        "light": "#979da6",
        "dark": "#979da6",
        "resolvedLight": "#979da6",
        "resolvedDark": "#979da6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-60": {
        "category": "static",
        "light": "#f5f6f7",
        "dark": "#f9fafb",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-600": {
        "category": "static",
        "light": "#81858c",
        "dark": "#81858c",
        "resolvedLight": "#81858c",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-700": {
        "category": "static",
        "light": "#61666b",
        "dark": "#61666b",
        "resolvedLight": "#61666b",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-75": {
        "category": "static",
        "light": "#f1f3f5",
        "dark": "#f1f3f5",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#f1f3f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-750": {
        "category": "static",
        "light": "#43454a",
        "dark": "#43454a",
        "resolvedLight": "#43454a",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-800": {
        "category": "static",
        "light": "#353638",
        "dark": "#353638",
        "resolvedLight": "#353638",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-850": {
        "category": "static",
        "light": "#2c2c2e",
        "dark": "#2c2c2e",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-875": {
        "category": "static",
        "light": "#232324",
        "dark": "#232324",
        "resolvedLight": "#232324",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-900": {
        "category": "static",
        "light": "#1b1b1c",
        "dark": "#1b1b1c",
        "resolvedLight": "#1b1b1c",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-950": {
        "category": "static",
        "light": "#151517",
        "dark": "#151517",
        "resolvedLight": "#151517",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-100": {
        "category": "static",
        "light": "#fee2e2",
        "dark": "#fee2e2",
        "resolvedLight": "#fee2e2",
        "resolvedDark": "#fee2e2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-400": {
        "category": "static",
        "light": "#f25a5a",
        "dark": "#f25a5a",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-400-a12": {
        "category": "static",
        "light": "#f25a5a1f",
        "dark": "#f25a5a1f",
        "resolvedLight": "#f25a5a1f",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-50": {
        "category": "static",
        "light": "#fef2f2",
        "dark": "#fef2f2",
        "resolvedLight": "#fef2f2",
        "resolvedDark": "#fef2f2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-500": {
        "category": "static",
        "light": "#ef4444",
        "dark": "#ef4444",
        "resolvedLight": "#ef4444",
        "resolvedDark": "#ef4444",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-600": {
        "category": "static",
        "light": "#ec1313",
        "dark": "#ec1313",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#ec1313",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-600-a08": {
        "category": "static",
        "light": "#ec131314",
        "dark": "#ec131314",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#ec131314",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-900": {
        "category": "static",
        "light": "#570c0c",
        "dark": "#570c0c",
        "resolvedLight": "#570c0c",
        "resolvedDark": "#570c0c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      }
    },
    "dshVariables": {
      "--dsh-code-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-size-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-code-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-text-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-border": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-hover": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-track-margin": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-width": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      }
    }
  },
  "0.2.1-rc.4": {
    "version": "0.2.1-rc.4",
    "tokenContractHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "tokens": {
      "--dsw-alias-bg-base": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#fff",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-bg-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-document-selection": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "resolvedLight": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "resolvedDark": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-layer-1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-875)",
        "resolvedLight": "#fff",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-bg-layer-2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-bg-layer-3": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-mask-1": {
        "category": "alias",
        "light": "#0000003d",
        "dark": "#00000080",
        "resolvedLight": "#0000003d",
        "resolvedDark": "#00000080",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-alias-bg-mask-2": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#0003",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#0003",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-3": {
        "category": "alias",
        "light": "#0000007a",
        "dark": "#0000007a",
        "resolvedLight": "#0000007a",
        "resolvedDark": "#0000007a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-drop": {
        "category": "alias",
        "light": "#ffffffb3",
        "dark": "#272730b3",
        "resolvedLight": "#ffffffb3",
        "resolvedDark": "#272730b3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-bg-mask-photo": {
        "category": "alias",
        "light": "#000000e0",
        "dark": "#000000e0",
        "resolvedLight": "#000000e0",
        "resolvedDark": "#000000e0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-module-platform": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-bg-multi-select": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-overlay": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-bg-skeleton": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff14",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-border-inverted": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-commands",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-border-inverted2": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff14",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-border-l1": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff1f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2-darkmode-thin": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-border-l3": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#ffffff29",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#ffffff29",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-layout",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-border-l4": {
        "category": "alias",
        "light": "#00000029",
        "dark": "#fff3",
        "resolvedLight": "#00000029",
        "resolvedDark": "#fff3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-brand-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-brand-primary-invert": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-brand-primary-new-colorprimary-new-color": {
        "category": "alias",
        "light": "#4176e6",
        "dark": "var(--dsw-static-deepseek-450)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-brand-text": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-contrast-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-button-elevated-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#fff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-button-floating-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-plan",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-floating-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-ghost-active-border": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-500)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#979da6",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-info-fill": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-button-info-hover": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-400)",
        "dark": "var(--dsw-static-deepseek-500)",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-button-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-primary-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-brand-primary)",
        "dark": "var(--dsw-alias-brand-primary)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-primary-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-750)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#43454a",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-tool-bar-fill": {
        "category": "alias",
        "light": "#54555780",
        "dark": "#54555780",
        "resolvedLight": "#54555780",
        "resolvedDark": "#54555780",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-fill-invisible": {
        "category": "alias",
        "light": "#1f1f1f5c",
        "dark": "#1f1f1f5c",
        "resolvedLight": "#1f1f1f5c",
        "resolvedDark": "#1f1f1f5c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-hover": {
        "category": "alias",
        "light": "#54555799",
        "dark": "#54555799",
        "resolvedLight": "#54555799",
        "resolvedDark": "#54555799",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-added": {
        "category": "alias",
        "light": "var(--dsw-static-green-500-a08)",
        "dark": "var(--dsw-static-green-500-a12)",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-deleted": {
        "category": "alias",
        "light": "var(--dsw-static-red-600-a08)",
        "dark": "var(--dsw-static-red-400-a12)",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-file-diff-added-bg": {
        "category": "alias",
        "light": "#e6f4e7",
        "dark": "#1f3124",
        "resolvedLight": "#e6f4e7",
        "resolvedDark": "#1f3124",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-gutter": {
        "category": "alias",
        "light": "#edf7ed",
        "dark": "#132016",
        "resolvedLight": "#edf7ed",
        "resolvedDark": "#132016",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-marker": {
        "category": "alias",
        "light": "#01a241",
        "dark": "#41c977",
        "resolvedLight": "#01a241",
        "resolvedDark": "#41c977",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-bg": {
        "category": "alias",
        "light": "#fce6e2",
        "dark": "#3c1f1b",
        "resolvedLight": "#fce6e2",
        "resolvedDark": "#3c1f1b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-gutter": {
        "category": "alias",
        "light": "#fdece9",
        "dark": "#28130e",
        "resolvedLight": "#fdece9",
        "resolvedDark": "#28130e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-marker": {
        "category": "alias",
        "light": "#ba2723",
        "dark": "#fa423e",
        "resolvedLight": "#ba2723",
        "resolvedDark": "#fa423e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-interactive-bg-active": {
        "category": "alias",
        "light": "#2631481a",
        "dark": "#ffffff24",
        "resolvedLight": "#2631481a",
        "resolvedDark": "#ffffff24",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-interactive-bg-hover": {
        "category": "alias",
        "light": "#2631480f",
        "dark": "#ffffff14",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-interactive-bg-hover-accent": {
        "category": "alias",
        "light": "#26314824",
        "dark": "#ffffff3d",
        "resolvedLight": "#26314824",
        "resolvedDark": "#ffffff3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-interactive-bg-hover-danger": {
        "category": "alias",
        "light": "#ec13130d",
        "dark": "#f25a5a26",
        "resolvedLight": "#ec13130d",
        "resolvedDark": "#f25a5a26",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-interactive-bg-hover-solid": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-label-caption": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-400)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-label-deep-diving": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 70%, #172554)",
        "resolvedDark": "color-mix(in srgb, #5686fe 55%, #adb2b8)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-deep-diving-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 30%, #172554)",
        "resolvedDark": "color-mix(in srgb, #93c5fd 65%, #7aaaff)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-label-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-label-primary-bluish": {
        "category": "alias",
        "light": "var(--dsw-static-blue-900)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-label-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-950)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#151517",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-label-primary-foreground": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-1000)",
        "resolvedLight": "#fff",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-label-primary-inverted": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-sidebar"
        ]
      },
      "--dsw-alias-label-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector",
          "dsh-session-log-export"
        ]
      },
      "--dsw-alias-label-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
        "resolvedLight": "color-mix(in srgb, #000 30%, transparent)",
        "resolvedDark": "color-mix(in srgb, #fff 45%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-600)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#81858c",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-link": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-markdown-citation": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block-banner": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-skill"
        ]
      },
      "--dsw-alias-markdown-code-segment-selected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-code-segment-unselected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-inline-code": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-50)",
        "dark": "var(--dsw-static-neutral-800)",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-placeholder": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-tag": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-group-header-fill": {
        "category": "alias",
        "light": "#f8f9faf0",
        "dark": "#303136f0",
        "resolvedLight": "#f8f9faf0",
        "resolvedDark": "#303136f0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-icon": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-alias-label-primary-dimmed)",
        "resolvedLight": "#353638",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-accent": {
        "category": "alias",
        "light": "#3964fe",
        "dark": "#3964fe",
        "resolvedLight": "#3964fe",
        "resolvedDark": "#3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-card-fill": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 80%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-bluish-850) 80%, transparent)",
        "resolvedLight": "color-mix(in srgb, #fff 80%, transparent)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e 80%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-checkbox-border": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-1000) 20%, transparent)",
        "dark": "var(--dsw-alias-border-l2)",
        "resolvedLight": "color-mix(in srgb, #0f1115 20%, transparent)",
        "resolvedDark": "#0000001a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-secondary-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "#48494c",
        "resolvedLight": "#fff",
        "resolvedDark": "#48494c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-scrollbar-bg-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-700)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-bg-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-scrollbar-hover-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-hover-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-550)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-settings-card-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-bg-layer-2)",
        "dark": "var(--dsw-alias-bg-layer-2)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-settings-card-stroke": {
        "category": "alias",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l4)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#00000029",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-state-business-primary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-state-business-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-deepseek-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-plan",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-error-primary": {
        "category": "alias",
        "light": "var(--dsw-static-red-600)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-error-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-red-400)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-idle-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-state-success-primary": {
        "category": "alias",
        "light": "var(--dsw-static-green-500)",
        "dark": "var(--dsw-static-green-500)",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-success-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-green-400)",
        "dark": "var(--dsw-static-green-400)",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-success-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-green-100)",
        "dark": "var(--dsw-static-green-900)",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-label": {
        "category": "alias",
        "light": "var(--dsw-static-amber-600)",
        "dark": "var(--dsw-static-amber-600)",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-primary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-500)",
        "dark": "var(--dsw-static-amber-500)",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-chat",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-tool",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-state-warn-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-400)",
        "dark": "var(--dsw-static-amber-400)",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-warn-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-100)",
        "dark": "var(--dsw-static-amber-900)",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-switch-thumb": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#fff",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#353638",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-label": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-00)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-tooltip-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-850)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-tooltip-key-bg": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "dark": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "resolvedLight": "color-mix(in srgb, #2c2c2e, white 18%)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e, white 18%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-turn-trigger-bg": {
        "category": "alias",
        "light": "var(--dsw-alias-markdown-code-block)",
        "dark": "var(--dsw-alias-interactive-bg-hover)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2631480f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-turn-trigger-bg-hover": {
        "category": "alias",
        "light": "var(--dsw-alias-interactive-bg-hover)",
        "dark": "var(--dsw-alias-interactive-bg-active)",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#2631481a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-corner-shape": {
        "category": "radius",
        "light": "superellipse(1.5)",
        "dark": "superellipse(1.5)",
        "resolvedLight": "superellipse(1.5)",
        "resolvedDark": "superellipse(1.5)",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-elevation-panel": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-prominent": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-soft": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "dark": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedLight": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedDark": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-elevation-stroke": {
        "category": "elevation",
        "light": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "dark": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "resolvedLight": "0 0 0 .5px #00000029",
        "resolvedDark": "0 0 0 .5px #00000029",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-stroke-color": {
        "category": "elevation",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l3)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#0000001f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme] [data-menu-material]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-focus-ring-color": {
        "category": "focus",
        "light": "transparent",
        "dark": "transparent",
        "resolvedLight": "transparent",
        "resolvedDark": "transparent",
        "selector": "html[data-input-modality=pointer] body :focus-visible:not(:read-write)",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-focus-ring-width": {
        "category": "focus",
        "light": "2px",
        "dark": "2px",
        "resolvedLight": "2px",
        "resolvedDark": "2px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-font-base-16": {
        "category": "font",
        "light": "16px/24px var(--dsw-font-family)",
        "dark": "16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16": {
        "category": "font",
        "light": "500 16px/24px var(--dsw-font-family)",
        "dark": "500 16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-family": {
        "category": "font",
        "light": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "dark": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-family-brand": {
        "category": "font",
        "light": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "dark": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-font-l-20": {
        "category": "font",
        "light": "500 20px/28px var(--dsw-font-family)",
        "dark": "500 20px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-l-20-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-size": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18": {
        "category": "font",
        "light": "500 16px/28px var(--dsw-font-family)",
        "dark": "500 16px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic": {
        "category": "font",
        "light": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic": {
        "category": "font",
        "light": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-code-block-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-font-markdown-code-block-small-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-line-height": {
        "category": "font",
        "light": "calc(16px + var(--dsh-code-font-delta))",
        "dark": "calc(16px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-size": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta))",
        "dark": "calc(12px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1": {
        "category": "font",
        "light": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-size": {
        "category": "font",
        "light": "calc(21px + var(--dsh-content-font-delta))",
        "dark": "calc(21px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-line-height": {
        "category": "font",
        "light": "calc(30px + var(--dsh-content-font-delta))",
        "dark": "calc(30px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2": {
        "category": "font",
        "light": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-size": {
        "category": "font",
        "light": "calc(19px + var(--dsh-content-font-delta))",
        "dark": "calc(19px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-line-height": {
        "category": "font",
        "light": "calc(28px + var(--dsh-content-font-delta))",
        "dark": "calc(28px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3": {
        "category": "font",
        "light": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-size": {
        "category": "font",
        "light": "calc(18px + var(--dsh-content-font-delta))",
        "dark": "calc(18px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-line-height": {
        "category": "font",
        "light": "calc(26px + var(--dsh-content-font-delta))",
        "dark": "calc(26px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small": {
        "category": "font",
        "light": "12px/20px var(--dsw-font-family)",
        "dark": "12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-small-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic": {
        "category": "font",
        "light": "italic 12px/20px var(--dsw-font-family)",
        "dark": "italic 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong": {
        "category": "font",
        "light": "600 12px/20px var(--dsw-font-family)",
        "dark": "600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic": {
        "category": "font",
        "light": "italic 600 12px/20px var(--dsw-font-family)",
        "dark": "italic 600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head": {
        "category": "font",
        "light": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14": {
        "category": "font",
        "light": "14px/22px var(--dsw-font-family)",
        "dark": "14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-s-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14": {
        "category": "font",
        "light": "500 14px/22px var(--dsw-font-family)",
        "dark": "500 14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24": {
        "category": "font",
        "light": "600 24px/32px var(--dsw-font-family)",
        "dark": "600 24px/32px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-size": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-line-height": {
        "category": "font",
        "light": "32px",
        "dark": "32px",
        "resolvedLight": "32px",
        "resolvedDark": "32px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13": {
        "category": "font",
        "light": "13px/20px var(--dsw-font-family)",
        "dark": "13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13": {
        "category": "font",
        "light": "500 13px/20px var(--dsw-font-family)",
        "dark": "500 13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-strong-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12": {
        "category": "font",
        "light": "12px/18px var(--dsw-font-family)",
        "dark": "12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxs-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12": {
        "category": "font",
        "light": "500 12px/18px var(--dsw-font-family)",
        "dark": "500 12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11": {
        "category": "font",
        "light": "11px/14px var(--dsw-font-family)",
        "dark": "11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxxs-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11": {
        "category": "font",
        "light": "500 11px/14px var(--dsw-font-family)",
        "dark": "500 11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-gradient-onboarding-blue-stops": {
        "category": "other",
        "light": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "dark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedLight": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedDark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-cyan-stops": {
        "category": "other",
        "light": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "dark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedLight": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedDark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-violet-stops": {
        "category": "other",
        "light": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "dark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedLight": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedDark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-linear-gradient-think": {
        "category": "other",
        "light": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "dark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "resolvedLight": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "resolvedDark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-linear-think-select": {
        "category": "other",
        "light": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "dark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "resolvedLight": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "resolvedDark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-mask-blur": {
        "category": "other",
        "light": "none",
        "dark": "none",
        "resolvedLight": "none",
        "resolvedDark": "none",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-menu-backdrop-filter": {
        "category": "other",
        "light": "blur(40px) saturate(150%)",
        "dark": "blur(40px) saturate(150%)",
        "resolvedLight": "blur(40px) saturate(150%)",
        "resolvedDark": "blur(40px) saturate(150%)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-menu-surface-fill": {
        "category": "other",
        "light": "#f8f9fa94",
        "dark": "#43454a73",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#43454a73",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-radius-lg": {
        "category": "radius",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-md": {
        "category": "radius",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-radius-panel": {
        "category": "radius",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-radius-sm": {
        "category": "radius",
        "light": "8px",
        "dark": "8px",
        "resolvedLight": "8px",
        "resolvedDark": "8px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-xl": {
        "category": "radius",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-radius-xs": {
        "category": "radius",
        "light": "4px",
        "dark": "4px",
        "resolvedLight": "4px",
        "resolvedDark": "4px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-shadow-lv1": {
        "category": "shadow",
        "light": "0 2px 4px 0 #0000000d",
        "dark": "0 2px 4px 0 #0000000d",
        "resolvedLight": "0 2px 4px 0 #0000000d",
        "resolvedDark": "0 2px 4px 0 #0000000d",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv1-blur": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005",
        "dark": "0 4px 12px 0 #00000005",
        "resolvedLight": "0 4px 12px 0 #00000005",
        "resolvedDark": "0 4px 12px 0 #00000005",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv2": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "dark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedLight": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedDark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval"
        ]
      },
      "--dsw-shadow-lv3": {
        "category": "shadow",
        "light": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "dark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedLight": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedDark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-specific-bubble": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-bubble-highlight": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-specific-input-major": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-login-input": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-specific-menu": {
        "category": "specific",
        "light": "var(--dsw-menu-surface-fill)",
        "dark": "var(--dsw-menu-surface-fill)",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#f8f9fa94",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-specific-selector": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-specific-sidebar-fill": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active-accent": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-sidebar-nav-item-hover": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-tip": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-static-amber-100": {
        "category": "static",
        "light": "#fef5e7",
        "dark": "#fef5e7",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#fef5e7",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-400": {
        "category": "static",
        "light": "#f7ad31",
        "dark": "#f7ad31",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-500": {
        "category": "static",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-600": {
        "category": "static",
        "light": "#dd8629",
        "dark": "#dd8629",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-900": {
        "category": "static",
        "light": "#27241f",
        "dark": "#27241f",
        "resolvedLight": "#27241f",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-100": {
        "category": "static",
        "light": "#dbeafe",
        "dark": "#dbeafe",
        "resolvedLight": "#dbeafe",
        "resolvedDark": "#dbeafe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-300": {
        "category": "static",
        "light": "#93c5fd",
        "dark": "#93c5fd",
        "resolvedLight": "#93c5fd",
        "resolvedDark": "#93c5fd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-400": {
        "category": "static",
        "light": "#60a5fa",
        "dark": "#60a5fa",
        "resolvedLight": "#60a5fa",
        "resolvedDark": "#60a5fa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-450": {
        "category": "static",
        "light": "#4d93f8",
        "dark": "#4d93f8",
        "resolvedLight": "#4d93f8",
        "resolvedDark": "#4d93f8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-static-blue-50": {
        "category": "static",
        "light": "#eff6ff",
        "dark": "#eff6ff",
        "resolvedLight": "#eff6ff",
        "resolvedDark": "#eff6ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-500": {
        "category": "static",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "resolvedLight": "#3b82f6",
        "resolvedDark": "#3b82f6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-static-blue-50p": {
        "category": "static",
        "light": "#eaf3ff",
        "dark": "#eaf3ff",
        "resolvedLight": "#eaf3ff",
        "resolvedDark": "#eaf3ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-600": {
        "category": "static",
        "light": "#2563eb",
        "dark": "#2563eb",
        "resolvedLight": "#2563eb",
        "resolvedDark": "#2563eb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-75": {
        "category": "static",
        "light": "#e5f0ff",
        "dark": "#e5f0ff",
        "resolvedLight": "#e5f0ff",
        "resolvedDark": "#e5f0ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-800": {
        "category": "static",
        "light": "#1e40af",
        "dark": "#1e40af",
        "resolvedLight": "#1e40af",
        "resolvedDark": "#1e40af",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-900": {
        "category": "static",
        "light": "#0e3074",
        "dark": "#0e3074",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#0e3074",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-950": {
        "category": "static",
        "light": "#172554",
        "dark": "#172554",
        "resolvedLight": "#172554",
        "resolvedDark": "#172554",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-100": {
        "category": "static",
        "light": "#e4edfd",
        "dark": "#e4edfd",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#e4edfd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-200": {
        "category": "static",
        "light": "#d3e2ff",
        "dark": "#d3e2ff",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#d3e2ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-300": {
        "category": "static",
        "light": "#b7c8fe",
        "dark": "#b7c8fe",
        "resolvedLight": "#b7c8fe",
        "resolvedDark": "#b7c8fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-400": {
        "category": "static",
        "light": "#7aaaff",
        "dark": "#7aaaff",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-450": {
        "category": "static",
        "light": "#5686fe",
        "dark": "#5686fe",
        "resolvedLight": "#5686fe",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-50": {
        "category": "static",
        "light": "#edf3fe",
        "dark": "#edf3fe",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#edf3fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-500": {
        "category": "static",
        "light": "#4176e6",
        "dark": "#4176e6",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-600": {
        "category": "static",
        "light": "#4868b2",
        "dark": "#4868b2",
        "resolvedLight": "#4868b2",
        "resolvedDark": "#4868b2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-700-delete": {
        "category": "static",
        "light": "#2f4c8f",
        "dark": "#2f4c8f",
        "resolvedLight": "#2f4c8f",
        "resolvedDark": "#2f4c8f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-800": {
        "category": "static",
        "light": "#34415b",
        "dark": "#34415b",
        "resolvedLight": "#34415b",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-900": {
        "category": "static",
        "light": "#283142",
        "dark": "#283142",
        "resolvedLight": "#283142",
        "resolvedDark": "#283142",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-green-100": {
        "category": "static",
        "light": "#e6faed",
        "dark": "#e6faed",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#e6faed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-400": {
        "category": "static",
        "light": "#4ed17e",
        "dark": "#4ed17e",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500": {
        "category": "static",
        "light": "#22c55e",
        "dark": "#22c55e",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a08": {
        "category": "static",
        "light": "#22c55e14",
        "dark": "#22c55e14",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a12": {
        "category": "static",
        "light": "#22c55e1f",
        "dark": "#22c55e1f",
        "resolvedLight": "#22c55e1f",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-900": {
        "category": "static",
        "light": "#233c2c",
        "dark": "#233c2c",
        "resolvedLight": "#233c2c",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-100": {
        "category": "static",
        "light": "#f5f5f5",
        "dark": "#f5f5f5",
        "resolvedLight": "#f5f5f5",
        "resolvedDark": "#f5f5f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-static-neutral-1000": {
        "category": "static",
        "light": "#000",
        "dark": "#000",
        "resolvedLight": "#000",
        "resolvedDark": "#000",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-150": {
        "category": "static",
        "light": "#ededed",
        "dark": "#ededed",
        "resolvedLight": "#ededed",
        "resolvedDark": "#ededed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-200": {
        "category": "static",
        "light": "#e5e5e5",
        "dark": "#e5e5e5",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#e5e5e5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-250": {
        "category": "static",
        "light": "#dcdcdc",
        "dark": "#dcdcdc",
        "resolvedLight": "#dcdcdc",
        "resolvedDark": "#dcdcdc",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-300": {
        "category": "static",
        "light": "#d4d4d4",
        "dark": "#d4d4d4",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#d4d4d4",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-400": {
        "category": "static",
        "light": "#a2a4a6",
        "dark": "#a2a4a6",
        "resolvedLight": "#a2a4a6",
        "resolvedDark": "#a2a4a6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-50": {
        "category": "static",
        "light": "#fafafa",
        "dark": "#fafafa",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#fafafa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-500": {
        "category": "static",
        "light": "#7f8287",
        "dark": "#7f8287",
        "resolvedLight": "#7f8287",
        "resolvedDark": "#7f8287",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-550": {
        "category": "static",
        "light": "#65676b",
        "dark": "#65676b",
        "resolvedLight": "#65676b",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-600": {
        "category": "static",
        "light": "#545557",
        "dark": "#545557",
        "resolvedLight": "#545557",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-700": {
        "category": "static",
        "light": "#3c3c3d",
        "dark": "#3c3c3d",
        "resolvedLight": "#3c3c3d",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-800": {
        "category": "static",
        "light": "#292929",
        "dark": "#292929",
        "resolvedLight": "#292929",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-850": {
        "category": "static",
        "light": "#212123",
        "dark": "#212123",
        "resolvedLight": "#212123",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-900": {
        "category": "static",
        "light": "#0f0f0f",
        "dark": "#0f0f0f",
        "resolvedLight": "#0f0f0f",
        "resolvedDark": "#0f0f0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-bluish-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-100": {
        "category": "static",
        "light": "#ebeef2",
        "dark": "#ebeef2",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-1000": {
        "category": "static",
        "light": "#0f1115",
        "dark": "#0f1115",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-150": {
        "category": "static",
        "light": "#e9ecf2",
        "dark": "#e9ecf2",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#e9ecf2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-200": {
        "category": "static",
        "light": "#e1e5ee",
        "dark": "#e1e5ee",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#e1e5ee",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-300": {
        "category": "static",
        "light": "#cfd3d6",
        "dark": "#cfd3d6",
        "resolvedLight": "#cfd3d6",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-400": {
        "category": "static",
        "light": "#adb2b8",
        "dark": "#adb2b8",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-50": {
        "category": "static",
        "light": "#f9fafb",
        "dark": "#f9fafb",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-500": {
        "category": "static",
        "light": "#979da6",
        "dark": "#979da6",
        "resolvedLight": "#979da6",
        "resolvedDark": "#979da6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-60": {
        "category": "static",
        "light": "#f5f6f7",
        "dark": "#f9fafb",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-600": {
        "category": "static",
        "light": "#81858c",
        "dark": "#81858c",
        "resolvedLight": "#81858c",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-700": {
        "category": "static",
        "light": "#61666b",
        "dark": "#61666b",
        "resolvedLight": "#61666b",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-75": {
        "category": "static",
        "light": "#f1f3f5",
        "dark": "#f1f3f5",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#f1f3f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-750": {
        "category": "static",
        "light": "#43454a",
        "dark": "#43454a",
        "resolvedLight": "#43454a",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-800": {
        "category": "static",
        "light": "#353638",
        "dark": "#353638",
        "resolvedLight": "#353638",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-850": {
        "category": "static",
        "light": "#2c2c2e",
        "dark": "#2c2c2e",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-875": {
        "category": "static",
        "light": "#232324",
        "dark": "#232324",
        "resolvedLight": "#232324",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-900": {
        "category": "static",
        "light": "#1b1b1c",
        "dark": "#1b1b1c",
        "resolvedLight": "#1b1b1c",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-950": {
        "category": "static",
        "light": "#151517",
        "dark": "#151517",
        "resolvedLight": "#151517",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-100": {
        "category": "static",
        "light": "#fee2e2",
        "dark": "#fee2e2",
        "resolvedLight": "#fee2e2",
        "resolvedDark": "#fee2e2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-400": {
        "category": "static",
        "light": "#f25a5a",
        "dark": "#f25a5a",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-400-a12": {
        "category": "static",
        "light": "#f25a5a1f",
        "dark": "#f25a5a1f",
        "resolvedLight": "#f25a5a1f",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-50": {
        "category": "static",
        "light": "#fef2f2",
        "dark": "#fef2f2",
        "resolvedLight": "#fef2f2",
        "resolvedDark": "#fef2f2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-500": {
        "category": "static",
        "light": "#ef4444",
        "dark": "#ef4444",
        "resolvedLight": "#ef4444",
        "resolvedDark": "#ef4444",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-600": {
        "category": "static",
        "light": "#ec1313",
        "dark": "#ec1313",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#ec1313",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-600-a08": {
        "category": "static",
        "light": "#ec131314",
        "dark": "#ec131314",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#ec131314",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-900": {
        "category": "static",
        "light": "#570c0c",
        "dark": "#570c0c",
        "resolvedLight": "#570c0c",
        "resolvedDark": "#570c0c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      }
    },
    "dshVariables": {
      "--dsh-code-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-size-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-code-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-text-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-border": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-hover": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-track-margin": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-width": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      }
    }
  },
  "0.2.1-rc.5": {
    "version": "0.2.1-rc.5",
    "tokenContractHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "tokens": {
      "--dsw-alias-bg-base": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#fff",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-bg-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-950)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-document-selection": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
        "resolvedLight": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "resolvedDark": "color-mix(in srgb, #3b82f6 40%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-layer-1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-875)",
        "resolvedLight": "#fff",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-bg-layer-2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-bg-layer-3": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-alias-bg-mask-1": {
        "category": "alias",
        "light": "#0000003d",
        "dark": "#00000080",
        "resolvedLight": "#0000003d",
        "resolvedDark": "#00000080",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-alias-bg-mask-2": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#0003",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#0003",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-3": {
        "category": "alias",
        "light": "#0000007a",
        "dark": "#0000007a",
        "resolvedLight": "#0000007a",
        "resolvedDark": "#0000007a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-mask-drop": {
        "category": "alias",
        "light": "#ffffffb3",
        "dark": "#272730b3",
        "resolvedLight": "#ffffffb3",
        "resolvedDark": "#272730b3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-bg-mask-photo": {
        "category": "alias",
        "light": "#000000e0",
        "dark": "#000000e0",
        "resolvedLight": "#000000e0",
        "resolvedDark": "#000000e0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-bg-module-platform": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-bg-multi-select": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-bg-overlay": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-bg-skeleton": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff14",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-border-inverted": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-commands",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-border-inverted2": {
        "category": "alias",
        "light": "#0000",
        "dark": "#ffffff14",
        "resolvedLight": "#0000",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-border-l1": {
        "category": "alias",
        "light": "#0000000a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000000a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff1f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-border-l2-darkmode-thin": {
        "category": "alias",
        "light": "#0000001a",
        "dark": "#ffffff0f",
        "resolvedLight": "#0000001a",
        "resolvedDark": "#ffffff0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-border-l3": {
        "category": "alias",
        "light": "#0000001f",
        "dark": "#ffffff29",
        "resolvedLight": "#0000001f",
        "resolvedDark": "#ffffff29",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-layout",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-border-l4": {
        "category": "alias",
        "light": "#00000029",
        "dark": "#fff3",
        "resolvedLight": "#00000029",
        "resolvedDark": "#fff3",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-alias-brand-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-brand-primary-invert": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-brand-primary-new-colorprimary-new-color": {
        "category": "alias",
        "light": "#4176e6",
        "dark": "var(--dsw-static-deepseek-450)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-brand-text": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-contrast-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-alias-button-elevated-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#fff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-sidebar",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-button-floating-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-plan",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-floating-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-alias-button-ghost-active-border": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-500)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#979da6",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-alias-button-ghost-active-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-150)",
        "dark": "var(--dsw-static-neutral-bluish-700)",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-info-fill": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-button-info-hover": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-400)",
        "dark": "var(--dsw-static-deepseek-500)",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-button-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-button-primary-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-brand-primary)",
        "dark": "var(--dsw-alias-brand-primary)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-primary-hover": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-750)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#43454a",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-button-tool-bar-fill": {
        "category": "alias",
        "light": "#54555780",
        "dark": "#54555780",
        "resolvedLight": "#54555780",
        "resolvedDark": "#54555780",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-fill-invisible": {
        "category": "alias",
        "light": "#1f1f1f5c",
        "dark": "#1f1f1f5c",
        "resolvedLight": "#1f1f1f5c",
        "resolvedDark": "#1f1f1f5c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-button-tool-bar-hover": {
        "category": "alias",
        "light": "#54555799",
        "dark": "#54555799",
        "resolvedLight": "#54555799",
        "resolvedDark": "#54555799",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-added": {
        "category": "alias",
        "light": "var(--dsw-static-green-500-a08)",
        "dark": "var(--dsw-static-green-500-a12)",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-code-diff-deleted": {
        "category": "alias",
        "light": "var(--dsw-static-red-600-a08)",
        "dark": "var(--dsw-static-red-400-a12)",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-file-diff-added-bg": {
        "category": "alias",
        "light": "#e6f4e7",
        "dark": "#1f3124",
        "resolvedLight": "#e6f4e7",
        "resolvedDark": "#1f3124",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-gutter": {
        "category": "alias",
        "light": "#edf7ed",
        "dark": "#132016",
        "resolvedLight": "#edf7ed",
        "resolvedDark": "#132016",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-added-marker": {
        "category": "alias",
        "light": "#01a241",
        "dark": "#41c977",
        "resolvedLight": "#01a241",
        "resolvedDark": "#41c977",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-bg": {
        "category": "alias",
        "light": "#fce6e2",
        "dark": "#3c1f1b",
        "resolvedLight": "#fce6e2",
        "resolvedDark": "#3c1f1b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-gutter": {
        "category": "alias",
        "light": "#fdece9",
        "dark": "#28130e",
        "resolvedLight": "#fdece9",
        "resolvedDark": "#28130e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-file-diff-deleted-marker": {
        "category": "alias",
        "light": "#ba2723",
        "dark": "#fa423e",
        "resolvedLight": "#ba2723",
        "resolvedDark": "#fa423e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables"
        ]
      },
      "--dsw-alias-interactive-bg-active": {
        "category": "alias",
        "light": "#2631481a",
        "dark": "#ffffff24",
        "resolvedLight": "#2631481a",
        "resolvedDark": "#ffffff24",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-interactive-bg-hover": {
        "category": "alias",
        "light": "#2631480f",
        "dark": "#ffffff14",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#ffffff14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-interactive-bg-hover-accent": {
        "category": "alias",
        "light": "#26314824",
        "dark": "#ffffff3d",
        "resolvedLight": "#26314824",
        "resolvedDark": "#ffffff3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-interactive-bg-hover-danger": {
        "category": "alias",
        "light": "#ec13130d",
        "dark": "#f25a5a26",
        "resolvedLight": "#ec13130d",
        "resolvedDark": "#f25a5a26",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models"
        ]
      },
      "--dsw-alias-interactive-bg-hover-solid": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-label-caption": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-400)",
        "dark": "var(--dsw-static-neutral-bluish-600)",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-alias-label-deep-diving": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 70%, #172554)",
        "resolvedDark": "color-mix(in srgb, #5686fe 55%, #adb2b8)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-deep-diving-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
        "dark": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
        "resolvedLight": "color-mix(in srgb, #4176e6 30%, #172554)",
        "resolvedDark": "color-mix(in srgb, #93c5fd 65%, #7aaaff)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-label-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-label-document-preview": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-1000)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-label-primary-bluish": {
        "category": "alias",
        "light": "var(--dsw-static-blue-900)",
        "dark": "var(--dsw-static-neutral-bluish-50)",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-alias-label-primary-dimmed": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-950)",
        "dark": "var(--dsw-static-neutral-bluish-100)",
        "resolvedLight": "#151517",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-label-primary-foreground": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-1000)",
        "resolvedLight": "#fff",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-label-primary-inverted": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-sidebar"
        ]
      },
      "--dsw-alias-label-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-700)",
        "dark": "var(--dsw-static-neutral-bluish-300)",
        "resolvedLight": "#61666b",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-session-log",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector",
          "dsh-session-log-export"
        ]
      },
      "--dsw-alias-label-shimmer": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
        "resolvedLight": "color-mix(in srgb, #000 30%, transparent)",
        "resolvedDark": "color-mix(in srgb, #fff 45%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-label-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-600)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#81858c",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-cot-translation",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-link": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-web-search",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-alias-markdown-citation": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-skill",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-markdown-code-block-banner": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-skill"
        ]
      },
      "--dsw-alias-markdown-code-segment-selected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#fff",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-code-segment-unselected": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-inline-code": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-50)",
        "dark": "var(--dsw-static-neutral-800)",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-placeholder": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-markdown-tag": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-group-header-fill": {
        "category": "alias",
        "light": "#f8f9faf0",
        "dark": "#303136f0",
        "resolvedLight": "#f8f9faf0",
        "resolvedDark": "#303136f0",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-menu-icon": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-alias-label-primary-dimmed)",
        "resolvedLight": "#353638",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-accent": {
        "category": "alias",
        "light": "#3964fe",
        "dark": "#3964fe",
        "resolvedLight": "#3964fe",
        "resolvedDark": "#3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-card-fill": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 80%, transparent)",
        "dark": "color-mix(in srgb, var(--dsw-static-neutral-bluish-850) 80%, transparent)",
        "resolvedLight": "color-mix(in srgb, #fff 80%, transparent)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e 80%, transparent)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-checkbox-border": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-static-neutral-bluish-1000) 20%, transparent)",
        "dark": "var(--dsw-alias-border-l2)",
        "resolvedLight": "color-mix(in srgb, #0f1115 20%, transparent)",
        "resolvedDark": "#0000001a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-onboarding-secondary-fill": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "#48494c",
        "resolvedLight": "#fff",
        "resolvedDark": "#48494c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-alias-scrollbar-bg-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-700)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-bg-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-200)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-scrollbar-hover-l1": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-scrollbar-hover-l2": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-550)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-settings-card-fill": {
        "category": "alias",
        "light": "var(--dsw-alias-bg-layer-2)",
        "dark": "var(--dsw-alias-bg-layer-2)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-settings-card-stroke": {
        "category": "alias",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l4)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#00000029",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory"
        ]
      },
      "--dsw-alias-state-business-primary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-500)",
        "dark": "var(--dsw-static-deepseek-400)",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input",
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-alias-state-business-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-deepseek-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-plan",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-error-primary": {
        "category": "alias",
        "light": "var(--dsw-static-red-600)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-goal",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-agent-team",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-error-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-red-400)",
        "dark": "var(--dsw-static-red-400)",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-idle-primary": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-300)",
        "dark": "var(--dsw-static-neutral-600)",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-state-success-primary": {
        "category": "alias",
        "light": "var(--dsw-static-green-500)",
        "dark": "var(--dsw-static-green-500)",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-alias-state-success-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-green-400)",
        "dark": "var(--dsw-static-green-400)",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-success-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-green-100)",
        "dark": "var(--dsw-static-green-900)",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-label": {
        "category": "alias",
        "light": "var(--dsw-static-amber-600)",
        "dark": "var(--dsw-static-amber-600)",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-cordis",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-alias-state-warn-primary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-500)",
        "dark": "var(--dsw-static-amber-500)",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-chat",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-tool",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-state-warn-secondary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-400)",
        "dark": "var(--dsw-static-amber-400)",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-shortcuts"
        ]
      },
      "--dsw-alias-state-warn-tertiary": {
        "category": "alias",
        "light": "var(--dsw-static-amber-100)",
        "dark": "var(--dsw-static-amber-900)",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-alias-switch-thumb": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-400)",
        "resolvedLight": "#fff",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-800)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#353638",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-alias-toast-label": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-00)",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-tooltip-bg": {
        "category": "alias",
        "light": "var(--dsw-static-neutral-bluish-850)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-alias-tooltip-key-bg": {
        "category": "alias",
        "light": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "dark": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
        "resolvedLight": "color-mix(in srgb, #2c2c2e, white 18%)",
        "resolvedDark": "color-mix(in srgb, #2c2c2e, white 18%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-alias-turn-trigger-bg": {
        "category": "alias",
        "light": "var(--dsw-alias-markdown-code-block)",
        "dark": "var(--dsw-alias-interactive-bg-hover)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#2631480f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-alias-turn-trigger-bg-hover": {
        "category": "alias",
        "light": "var(--dsw-alias-interactive-bg-hover)",
        "dark": "var(--dsw-alias-interactive-bg-active)",
        "resolvedLight": "#2631480f",
        "resolvedDark": "#2631481a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat"
        ]
      },
      "--dsw-corner-shape": {
        "category": "radius",
        "light": "superellipse(1.5)",
        "dark": "superellipse(1.5)",
        "resolvedLight": "superellipse(1.5)",
        "resolvedDark": "superellipse(1.5)",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-elevation-panel": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-prominent": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "dark": "var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedLight": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "resolvedDark": "0 0 0 .5px #00000029, 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-soft": {
        "category": "elevation",
        "light": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "dark": "var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedLight": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "resolvedDark": "0 0 0 .5px #00000029, 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-elevation-stroke": {
        "category": "elevation",
        "light": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "dark": "0 0 0 .5px var(--dsw-elevation-stroke-color)",
        "resolvedLight": "0 0 0 .5px #00000029",
        "resolvedDark": "0 0 0 .5px #00000029",
        "selector": "body,body *",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-elevation-stroke-color": {
        "category": "elevation",
        "light": "var(--dsw-alias-border-l4)",
        "dark": "var(--dsw-alias-border-l3)",
        "resolvedLight": "#00000029",
        "resolvedDark": "#0000001f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme] [data-menu-material]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-focus-ring-color": {
        "category": "focus",
        "light": "transparent",
        "dark": "transparent",
        "resolvedLight": "transparent",
        "resolvedDark": "transparent",
        "selector": "html[data-input-modality=pointer] body :focus-visible:not(:read-write)",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-focus-ring-width": {
        "category": "focus",
        "light": "2px",
        "dark": "2px",
        "resolvedLight": "2px",
        "resolvedDark": "2px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-conversation",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-plugins",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-theme",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-font-base-16": {
        "category": "font",
        "light": "16px/24px var(--dsw-font-family)",
        "dark": "16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16": {
        "category": "font",
        "light": "500 16px/24px var(--dsw-font-family)",
        "dark": "500 16px/24px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-base-strong-16-line-height": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-family": {
        "category": "font",
        "light": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "dark": "var(--dsh-font-family-text,var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-family-brand": {
        "category": "font",
        "light": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "dark": "\"Montserrat\", var(--dsh-font-family-text-default)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-font-l-20": {
        "category": "font",
        "light": "500 20px/28px var(--dsw-font-family)",
        "dark": "500 20px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-l-20-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-size": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-l-20-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18": {
        "category": "font",
        "light": "500 16px/28px var(--dsw-font-family)",
        "dark": "500 16px/28px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-size": {
        "category": "font",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-m-18-line-height": {
        "category": "font",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic": {
        "category": "font",
        "light": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic": {
        "category": "font",
        "light": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-italic-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-base-strong-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "calc(12px + var(--dsh-code-font-delta)) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(19px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-code-block-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "dark": "var(--dsh-code-font-size,11px) / calc(16px + var(--dsh-code-font-delta)) var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-cordis",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-skill",
          "dsh-client-ui-tool"
        ]
      },
      "--dsw-font-markdown-code-block-small-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-size": {
        "category": "font",
        "light": "var(--dsh-code-font-size,11px)",
        "dark": "var(--dsh-code-font-size,11px)",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-block-small-line-height": {
        "category": "font",
        "light": "calc(16px + var(--dsh-code-font-delta))",
        "dark": "calc(16px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-family": {
        "category": "font",
        "light": "var(--ds-font-family-code)",
        "dark": "var(--ds-font-family-code)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-size": {
        "category": "font",
        "light": "calc(12px + var(--dsh-code-font-delta))",
        "dark": "calc(12px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-code-line-height": {
        "category": "font",
        "light": "calc(19px + var(--dsh-code-font-delta))",
        "dark": "calc(19px + var(--dsh-code-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1": {
        "category": "font",
        "light": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-size": {
        "category": "font",
        "light": "calc(21px + var(--dsh-content-font-delta))",
        "dark": "calc(21px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h1-line-height": {
        "category": "font",
        "light": "calc(30px + var(--dsh-content-font-delta))",
        "dark": "calc(30px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2": {
        "category": "font",
        "light": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-size": {
        "category": "font",
        "light": "calc(19px + var(--dsh-content-font-delta))",
        "dark": "calc(19px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h2-line-height": {
        "category": "font",
        "light": "calc(28px + var(--dsh-content-font-delta))",
        "dark": "calc(28px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3": {
        "category": "font",
        "light": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-size": {
        "category": "font",
        "light": "calc(18px + var(--dsh-content-font-delta))",
        "dark": "calc(18px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-font-weight": {
        "category": "font",
        "light": "700",
        "dark": "700",
        "resolvedLight": "700",
        "resolvedDark": "700",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h3-line-height": {
        "category": "font",
        "light": "calc(26px + var(--dsh-content-font-delta))",
        "dark": "calc(26px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4": {
        "category": "font",
        "light": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "dark": "600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size,14px)",
        "dark": "var(--dsh-content-font-size,14px)",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-h4-line-height": {
        "category": "font",
        "light": "calc(24px + var(--dsh-content-font-delta))",
        "dark": "calc(24px + var(--dsh-content-font-delta))",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small": {
        "category": "font",
        "light": "12px/20px var(--dsw-font-family)",
        "dark": "12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-documentpreview"
        ]
      },
      "--dsw-font-markdown-small-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic": {
        "category": "font",
        "light": "italic 12px/20px var(--dsw-font-family)",
        "dark": "italic 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong": {
        "category": "font",
        "light": "600 12px/20px var(--dsw-font-family)",
        "dark": "600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic": {
        "category": "font",
        "light": "italic 600 12px/20px var(--dsw-font-family)",
        "dark": "italic 600 12px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-style": {
        "category": "font",
        "light": "italic",
        "dark": "italic",
        "resolvedLight": "italic",
        "resolvedDark": "italic",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-italic-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-small-strong-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head": {
        "category": "font",
        "light": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "dark": "500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-size": {
        "category": "font",
        "light": "var(--dsh-content-font-size-secondary,13px)",
        "dark": "var(--dsh-content-font-size-secondary,13px)",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-head-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-markdown-table-line-height": {
        "category": "font",
        "light": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "dark": "calc(22px + var(--dsh-content-font-delta-secondary,0px))",
        "resolvedLight": "calc(22px + 0px)",
        "resolvedDark": "calc(22px + 0px)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14": {
        "category": "font",
        "light": "14px/22px var(--dsw-font-family)",
        "dark": "14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-attachment"
        ]
      },
      "--dsw-font-s-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14": {
        "category": "font",
        "light": "500 14px/22px var(--dsw-font-family)",
        "dark": "500 14px/22px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-size": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-s-strong-14-line-height": {
        "category": "font",
        "light": "22px",
        "dark": "22px",
        "resolvedLight": "22px",
        "resolvedDark": "22px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24": {
        "category": "font",
        "light": "600 24px/32px var(--dsw-font-family)",
        "dark": "600 24px/32px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-size": {
        "category": "font",
        "light": "24px",
        "dark": "24px",
        "resolvedLight": "24px",
        "resolvedDark": "24px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-font-weight": {
        "category": "font",
        "light": "600",
        "dark": "600",
        "resolvedLight": "600",
        "resolvedDark": "600",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xl-24-line-height": {
        "category": "font",
        "light": "32px",
        "dark": "32px",
        "resolvedLight": "32px",
        "resolvedDark": "32px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13": {
        "category": "font",
        "light": "13px/20px var(--dsw-font-family)",
        "dark": "13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13": {
        "category": "font",
        "light": "500 13px/20px var(--dsw-font-family)",
        "dark": "500 13px/20px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xs-strong-13-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-size": {
        "category": "font",
        "light": "13px",
        "dark": "13px",
        "resolvedLight": "13px",
        "resolvedDark": "13px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xs-strong-13-line-height": {
        "category": "font",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12": {
        "category": "font",
        "light": "12px/18px var(--dsw-font-family)",
        "dark": "12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxs-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12": {
        "category": "font",
        "light": "500 12px/18px var(--dsw-font-family)",
        "dark": "500 12px/18px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-size": {
        "category": "font",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxs-strong-12-line-height": {
        "category": "font",
        "light": "18px",
        "dark": "18px",
        "resolvedLight": "18px",
        "resolvedDark": "18px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11": {
        "category": "font",
        "light": "11px/14px var(--dsw-font-family)",
        "dark": "11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-font-xxxs-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-font-weight": {
        "category": "font",
        "light": "400",
        "dark": "400",
        "resolvedLight": "400",
        "resolvedDark": "400",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11": {
        "category": "font",
        "light": "500 11px/14px var(--dsw-font-family)",
        "dark": "500 11px/14px var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-family": {
        "category": "font",
        "light": "var(--dsw-font-family)",
        "dark": "var(--dsw-font-family)",
        "resolvedLight": null,
        "resolvedDark": null,
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-size": {
        "category": "font",
        "light": "11px",
        "dark": "11px",
        "resolvedLight": "11px",
        "resolvedDark": "11px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-style": {
        "category": "font",
        "light": "normal",
        "dark": "normal",
        "resolvedLight": "normal",
        "resolvedDark": "normal",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-font-weight": {
        "category": "font",
        "light": "500",
        "dark": "500",
        "resolvedLight": "500",
        "resolvedDark": "500",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-font-xxxs-strong-11-line-height": {
        "category": "font",
        "light": "14px",
        "dark": "14px",
        "resolvedLight": "14px",
        "resolvedDark": "14px",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-gradient-onboarding-blue-stops": {
        "category": "other",
        "light": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "dark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedLight": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "resolvedDark": "#3964fe 18.75%, #398efe 51.78%, #6dccff 86.252%, #3964fe",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-cyan-stops": {
        "category": "other",
        "light": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "dark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedLight": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "resolvedDark": "#0293b4 21.154%, #2dc8eb 50.954%, #aff0ff 85.326%, #0293b4",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-gradient-onboarding-violet-stops": {
        "category": "other",
        "light": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "dark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedLight": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "resolvedDark": "#2a2fb6 33.102%, #8b76f6 50.954%, #c5c0ff 85.326%, #2a2fb6",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account"
        ]
      },
      "--dsw-linear-gradient-think": {
        "category": "other",
        "light": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "dark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "resolvedLight": "linear-gradient(180deg, #fff 20.19%, #fff0 100%)",
        "resolvedDark": "linear-gradient(180deg, #151517 20.19%, #15151700 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-linear-think-select": {
        "category": "other",
        "light": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "dark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "resolvedLight": "linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%)",
        "resolvedDark": "linear-gradient(180deg, #232325 20.19%, #23232500 100%)",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-mask-blur": {
        "category": "other",
        "light": "none",
        "dark": "none",
        "resolvedLight": "none",
        "resolvedDark": "none",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-menu-backdrop-filter": {
        "category": "other",
        "light": "blur(40px) saturate(150%)",
        "dark": "blur(40px) saturate(150%)",
        "resolvedLight": "blur(40px) saturate(150%)",
        "resolvedDark": "blur(40px) saturate(150%)",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-menu-surface-fill": {
        "category": "other",
        "light": "#f8f9fa94",
        "dark": "#43454a73",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#43454a73",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-radius-lg": {
        "category": "radius",
        "light": "16px",
        "dark": "16px",
        "resolvedLight": "16px",
        "resolvedDark": "16px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-md": {
        "category": "radius",
        "light": "12px",
        "dark": "12px",
        "resolvedLight": "12px",
        "resolvedDark": "12px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-locale",
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-settings-subagent",
          "dsh-client-ui-shortcuts",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-subagent",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace",
          "dsh-experimental-client-ui-cot-translation"
        ]
      },
      "--dsw-radius-panel": {
        "category": "radius",
        "light": "28px",
        "dark": "28px",
        "resolvedLight": "28px",
        "resolvedDark": "28px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-radius-sm": {
        "category": "radius",
        "light": "8px",
        "dark": "8px",
        "resolvedLight": "8px",
        "resolvedDark": "8px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-chat",
          "dsh-client-ui-commands",
          "dsh-client-ui-conversation",
          "dsh-client-ui-deliverables",
          "dsh-client-ui-directory-picker-browse",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-message-feedback",
          "dsh-client-ui-model-selection",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-permission-presets",
          "dsh-client-ui-plan",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-schedule",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-general",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-sidebar-browser",
          "dsh-client-ui-sidebar-documentpreview",
          "dsh-client-ui-sidebar-files",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-sidebar-terminal",
          "dsh-client-ui-skill",
          "dsh-client-ui-subagent",
          "dsh-client-ui-tool",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workflow-run",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-radius-xl": {
        "category": "radius",
        "light": "20px",
        "dark": "20px",
        "resolvedLight": "20px",
        "resolvedDark": "20px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-radius-xs": {
        "category": "radius",
        "light": "4px",
        "dark": "4px",
        "resolvedLight": "4px",
        "resolvedDark": "4px",
        "selector": ":root",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-open-in-app",
          "dsh-client-ui-plugin-manager",
          "dsh-client-ui-plugin-market",
          "dsh-client-ui-secret-mask",
          "dsh-client-ui-settings-models",
          "dsh-client-ui-settings-plugin-inventory",
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-user-questions",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-shadow-lv1": {
        "category": "shadow",
        "light": "0 2px 4px 0 #0000000d",
        "dark": "0 2px 4px 0 #0000000d",
        "resolvedLight": "0 2px 4px 0 #0000000d",
        "resolvedDark": "0 2px 4px 0 #0000000d",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv1-blur": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005",
        "dark": "0 4px 12px 0 #00000005",
        "resolvedLight": "0 4px 12px 0 #00000005",
        "resolvedDark": "0 4px 12px 0 #00000005",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-shadow-lv2": {
        "category": "shadow",
        "light": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "dark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedLight": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "resolvedDark": "0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-approval"
        ]
      },
      "--dsw-shadow-lv3": {
        "category": "shadow",
        "light": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "dark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedLight": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "resolvedDark": "0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014",
        "selector": "body",
        "darkSelector": null,
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-specific-bubble": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-50)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-goal",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-bubble-highlight": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-200)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-experimental-session-inspector"
        ]
      },
      "--dsw-specific-input-major": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-00)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#fff",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-approval",
          "dsh-client-ui-attachment",
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-settings-account",
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-login-input": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-specific-menu": {
        "category": "specific",
        "light": "var(--dsw-menu-surface-fill)",
        "dark": "var(--dsw-menu-surface-fill)",
        "resolvedLight": "#f8f9fa94",
        "resolvedDark": "#f8f9fa94",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-chat",
          "dsh-client-ui-conversation",
          "dsh-client-ui-cordis",
          "dsh-client-ui-goal",
          "dsh-client-ui-input-trigger",
          "dsh-client-ui-jobs",
          "dsh-client-ui-schedule",
          "dsh-client-ui-subagent",
          "dsh-experimental-client-ui-agent-team"
        ]
      },
      "--dsw-specific-selector": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-conversation",
          "dsh-experimental-client-ui-voice-input"
        ]
      },
      "--dsw-specific-sidebar-fill": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-50)",
        "dark": "var(--dsw-static-neutral-bluish-900)",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-layout",
          "dsh-client-ui-schedule",
          "dsh-client-ui-sidebar",
          "dsh-client-ui-trajectory",
          "dsh-client-ui-workspace"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-100)",
        "dark": "var(--dsw-static-neutral-bluish-750)",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-sidebar-nav-item-active-accent": {
        "category": "specific",
        "light": "var(--dsw-static-deepseek-100)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-user-questions"
        ]
      },
      "--dsw-specific-sidebar-nav-item-hover": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-75)",
        "dark": "var(--dsw-static-neutral-bluish-850)",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-settings-general"
        ]
      },
      "--dsw-specific-tip": {
        "category": "specific",
        "light": "var(--dsw-static-neutral-bluish-60)",
        "dark": "var(--dsw-static-neutral-bluish-800)",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": []
      },
      "--dsw-static-amber-100": {
        "category": "static",
        "light": "#fef5e7",
        "dark": "#fef5e7",
        "resolvedLight": "#fef5e7",
        "resolvedDark": "#fef5e7",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-400": {
        "category": "static",
        "light": "#f7ad31",
        "dark": "#f7ad31",
        "resolvedLight": "#f7ad31",
        "resolvedDark": "#f7ad31",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-500": {
        "category": "static",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "resolvedLight": "#f59e0b",
        "resolvedDark": "#f59e0b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-600": {
        "category": "static",
        "light": "#dd8629",
        "dark": "#dd8629",
        "resolvedLight": "#dd8629",
        "resolvedDark": "#dd8629",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-amber-900": {
        "category": "static",
        "light": "#27241f",
        "dark": "#27241f",
        "resolvedLight": "#27241f",
        "resolvedDark": "#27241f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-100": {
        "category": "static",
        "light": "#dbeafe",
        "dark": "#dbeafe",
        "resolvedLight": "#dbeafe",
        "resolvedDark": "#dbeafe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-300": {
        "category": "static",
        "light": "#93c5fd",
        "dark": "#93c5fd",
        "resolvedLight": "#93c5fd",
        "resolvedDark": "#93c5fd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-400": {
        "category": "static",
        "light": "#60a5fa",
        "dark": "#60a5fa",
        "resolvedLight": "#60a5fa",
        "resolvedDark": "#60a5fa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-450": {
        "category": "static",
        "light": "#4d93f8",
        "dark": "#4d93f8",
        "resolvedLight": "#4d93f8",
        "resolvedDark": "#4d93f8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-conversation"
        ]
      },
      "--dsw-static-blue-50": {
        "category": "static",
        "light": "#eff6ff",
        "dark": "#eff6ff",
        "resolvedLight": "#eff6ff",
        "resolvedDark": "#eff6ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-500": {
        "category": "static",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "resolvedLight": "#3b82f6",
        "resolvedDark": "#3b82f6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme",
          "dsh-client-ui-trajectory"
        ]
      },
      "--dsw-static-blue-50p": {
        "category": "static",
        "light": "#eaf3ff",
        "dark": "#eaf3ff",
        "resolvedLight": "#eaf3ff",
        "resolvedDark": "#eaf3ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-600": {
        "category": "static",
        "light": "#2563eb",
        "dark": "#2563eb",
        "resolvedLight": "#2563eb",
        "resolvedDark": "#2563eb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-75": {
        "category": "static",
        "light": "#e5f0ff",
        "dark": "#e5f0ff",
        "resolvedLight": "#e5f0ff",
        "resolvedDark": "#e5f0ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-800": {
        "category": "static",
        "light": "#1e40af",
        "dark": "#1e40af",
        "resolvedLight": "#1e40af",
        "resolvedDark": "#1e40af",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-blue-900": {
        "category": "static",
        "light": "#0e3074",
        "dark": "#0e3074",
        "resolvedLight": "#0e3074",
        "resolvedDark": "#0e3074",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-blue-950": {
        "category": "static",
        "light": "#172554",
        "dark": "#172554",
        "resolvedLight": "#172554",
        "resolvedDark": "#172554",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-100": {
        "category": "static",
        "light": "#e4edfd",
        "dark": "#e4edfd",
        "resolvedLight": "#e4edfd",
        "resolvedDark": "#e4edfd",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-200": {
        "category": "static",
        "light": "#d3e2ff",
        "dark": "#d3e2ff",
        "resolvedLight": "#d3e2ff",
        "resolvedDark": "#d3e2ff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-300": {
        "category": "static",
        "light": "#b7c8fe",
        "dark": "#b7c8fe",
        "resolvedLight": "#b7c8fe",
        "resolvedDark": "#b7c8fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-400": {
        "category": "static",
        "light": "#7aaaff",
        "dark": "#7aaaff",
        "resolvedLight": "#7aaaff",
        "resolvedDark": "#7aaaff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-450": {
        "category": "static",
        "light": "#5686fe",
        "dark": "#5686fe",
        "resolvedLight": "#5686fe",
        "resolvedDark": "#5686fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-50": {
        "category": "static",
        "light": "#edf3fe",
        "dark": "#edf3fe",
        "resolvedLight": "#edf3fe",
        "resolvedDark": "#edf3fe",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-500": {
        "category": "static",
        "light": "#4176e6",
        "dark": "#4176e6",
        "resolvedLight": "#4176e6",
        "resolvedDark": "#4176e6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-600": {
        "category": "static",
        "light": "#4868b2",
        "dark": "#4868b2",
        "resolvedLight": "#4868b2",
        "resolvedDark": "#4868b2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-700-delete": {
        "category": "static",
        "light": "#2f4c8f",
        "dark": "#2f4c8f",
        "resolvedLight": "#2f4c8f",
        "resolvedDark": "#2f4c8f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-deepseek-800": {
        "category": "static",
        "light": "#34415b",
        "dark": "#34415b",
        "resolvedLight": "#34415b",
        "resolvedDark": "#34415b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-deepseek-900": {
        "category": "static",
        "light": "#283142",
        "dark": "#283142",
        "resolvedLight": "#283142",
        "resolvedDark": "#283142",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-green-100": {
        "category": "static",
        "light": "#e6faed",
        "dark": "#e6faed",
        "resolvedLight": "#e6faed",
        "resolvedDark": "#e6faed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-400": {
        "category": "static",
        "light": "#4ed17e",
        "dark": "#4ed17e",
        "resolvedLight": "#4ed17e",
        "resolvedDark": "#4ed17e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500": {
        "category": "static",
        "light": "#22c55e",
        "dark": "#22c55e",
        "resolvedLight": "#22c55e",
        "resolvedDark": "#22c55e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a08": {
        "category": "static",
        "light": "#22c55e14",
        "dark": "#22c55e14",
        "resolvedLight": "#22c55e14",
        "resolvedDark": "#22c55e14",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-500-a12": {
        "category": "static",
        "light": "#22c55e1f",
        "dark": "#22c55e1f",
        "resolvedLight": "#22c55e1f",
        "resolvedDark": "#22c55e1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-green-900": {
        "category": "static",
        "light": "#233c2c",
        "dark": "#233c2c",
        "resolvedLight": "#233c2c",
        "resolvedDark": "#233c2c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-100": {
        "category": "static",
        "light": "#f5f5f5",
        "dark": "#f5f5f5",
        "resolvedLight": "#f5f5f5",
        "resolvedDark": "#f5f5f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule"
        ]
      },
      "--dsw-static-neutral-1000": {
        "category": "static",
        "light": "#000",
        "dark": "#000",
        "resolvedLight": "#000",
        "resolvedDark": "#000",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-150": {
        "category": "static",
        "light": "#ededed",
        "dark": "#ededed",
        "resolvedLight": "#ededed",
        "resolvedDark": "#ededed",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-200": {
        "category": "static",
        "light": "#e5e5e5",
        "dark": "#e5e5e5",
        "resolvedLight": "#e5e5e5",
        "resolvedDark": "#e5e5e5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-250": {
        "category": "static",
        "light": "#dcdcdc",
        "dark": "#dcdcdc",
        "resolvedLight": "#dcdcdc",
        "resolvedDark": "#dcdcdc",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-300": {
        "category": "static",
        "light": "#d4d4d4",
        "dark": "#d4d4d4",
        "resolvedLight": "#d4d4d4",
        "resolvedDark": "#d4d4d4",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-400": {
        "category": "static",
        "light": "#a2a4a6",
        "dark": "#a2a4a6",
        "resolvedLight": "#a2a4a6",
        "resolvedDark": "#a2a4a6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-50": {
        "category": "static",
        "light": "#fafafa",
        "dark": "#fafafa",
        "resolvedLight": "#fafafa",
        "resolvedDark": "#fafafa",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-500": {
        "category": "static",
        "light": "#7f8287",
        "dark": "#7f8287",
        "resolvedLight": "#7f8287",
        "resolvedDark": "#7f8287",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-550": {
        "category": "static",
        "light": "#65676b",
        "dark": "#65676b",
        "resolvedLight": "#65676b",
        "resolvedDark": "#65676b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-600": {
        "category": "static",
        "light": "#545557",
        "dark": "#545557",
        "resolvedLight": "#545557",
        "resolvedDark": "#545557",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-700": {
        "category": "static",
        "light": "#3c3c3d",
        "dark": "#3c3c3d",
        "resolvedLight": "#3c3c3d",
        "resolvedDark": "#3c3c3d",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-sidebar-right",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-800": {
        "category": "static",
        "light": "#292929",
        "dark": "#292929",
        "resolvedLight": "#292929",
        "resolvedDark": "#292929",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-850": {
        "category": "static",
        "light": "#212123",
        "dark": "#212123",
        "resolvedLight": "#212123",
        "resolvedDark": "#212123",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-deliverables",
          "dsh-client-ui-plan",
          "dsh-client-ui-schedule",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-900": {
        "category": "static",
        "light": "#0f0f0f",
        "dark": "#0f0f0f",
        "resolvedLight": "#0f0f0f",
        "resolvedDark": "#0f0f0f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-neutral-bluish-00": {
        "category": "static",
        "light": "#fff",
        "dark": "#fff",
        "resolvedLight": "#fff",
        "resolvedDark": "#fff",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-100": {
        "category": "static",
        "light": "#ebeef2",
        "dark": "#ebeef2",
        "resolvedLight": "#ebeef2",
        "resolvedDark": "#ebeef2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-1000": {
        "category": "static",
        "light": "#0f1115",
        "dark": "#0f1115",
        "resolvedLight": "#0f1115",
        "resolvedDark": "#0f1115",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-150": {
        "category": "static",
        "light": "#e9ecf2",
        "dark": "#e9ecf2",
        "resolvedLight": "#e9ecf2",
        "resolvedDark": "#e9ecf2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-200": {
        "category": "static",
        "light": "#e1e5ee",
        "dark": "#e1e5ee",
        "resolvedLight": "#e1e5ee",
        "resolvedDark": "#e1e5ee",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-300": {
        "category": "static",
        "light": "#cfd3d6",
        "dark": "#cfd3d6",
        "resolvedLight": "#cfd3d6",
        "resolvedDark": "#cfd3d6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-400": {
        "category": "static",
        "light": "#adb2b8",
        "dark": "#adb2b8",
        "resolvedLight": "#adb2b8",
        "resolvedDark": "#adb2b8",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-agent-preset",
          "dsh-client-ui-conversation",
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-50": {
        "category": "static",
        "light": "#f9fafb",
        "dark": "#f9fafb",
        "resolvedLight": "#f9fafb",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-500": {
        "category": "static",
        "light": "#979da6",
        "dark": "#979da6",
        "resolvedLight": "#979da6",
        "resolvedDark": "#979da6",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-60": {
        "category": "static",
        "light": "#f5f6f7",
        "dark": "#f9fafb",
        "resolvedLight": "#f5f6f7",
        "resolvedDark": "#f9fafb",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": false,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-600": {
        "category": "static",
        "light": "#81858c",
        "dark": "#81858c",
        "resolvedLight": "#81858c",
        "resolvedDark": "#81858c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-700": {
        "category": "static",
        "light": "#61666b",
        "dark": "#61666b",
        "resolvedLight": "#61666b",
        "resolvedDark": "#61666b",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-75": {
        "category": "static",
        "light": "#f1f3f5",
        "dark": "#f1f3f5",
        "resolvedLight": "#f1f3f5",
        "resolvedDark": "#f1f3f5",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-750": {
        "category": "static",
        "light": "#43454a",
        "dark": "#43454a",
        "resolvedLight": "#43454a",
        "resolvedDark": "#43454a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-800": {
        "category": "static",
        "light": "#353638",
        "dark": "#353638",
        "resolvedLight": "#353638",
        "resolvedDark": "#353638",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-850": {
        "category": "static",
        "light": "#2c2c2e",
        "dark": "#2c2c2e",
        "resolvedLight": "#2c2c2e",
        "resolvedDark": "#2c2c2e",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-875": {
        "category": "static",
        "light": "#232324",
        "dark": "#232324",
        "resolvedLight": "#232324",
        "resolvedDark": "#232324",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-900": {
        "category": "static",
        "light": "#1b1b1c",
        "dark": "#1b1b1c",
        "resolvedLight": "#1b1b1c",
        "resolvedDark": "#1b1b1c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-neutral-bluish-950": {
        "category": "static",
        "light": "#151517",
        "dark": "#151517",
        "resolvedLight": "#151517",
        "resolvedDark": "#151517",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-100": {
        "category": "static",
        "light": "#fee2e2",
        "dark": "#fee2e2",
        "resolvedLight": "#fee2e2",
        "resolvedDark": "#fee2e2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-400": {
        "category": "static",
        "light": "#f25a5a",
        "dark": "#f25a5a",
        "resolvedLight": "#f25a5a",
        "resolvedDark": "#f25a5a",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-400-a12": {
        "category": "static",
        "light": "#f25a5a1f",
        "dark": "#f25a5a1f",
        "resolvedLight": "#f25a5a1f",
        "resolvedDark": "#f25a5a1f",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-50": {
        "category": "static",
        "light": "#fef2f2",
        "dark": "#fef2f2",
        "resolvedLight": "#fef2f2",
        "resolvedDark": "#fef2f2",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-500": {
        "category": "static",
        "light": "#ef4444",
        "dark": "#ef4444",
        "resolvedLight": "#ef4444",
        "resolvedDark": "#ef4444",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      },
      "--dsw-static-red-600": {
        "category": "static",
        "light": "#ec1313",
        "dark": "#ec1313",
        "resolvedLight": "#ec1313",
        "resolvedDark": "#ec1313",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-600-a08": {
        "category": "static",
        "light": "#ec131314",
        "dark": "#ec131314",
        "resolvedLight": "#ec131314",
        "resolvedDark": "#ec131314",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": [
          "dsh-client-ui-theme"
        ]
      },
      "--dsw-static-red-900": {
        "category": "static",
        "light": "#570c0c",
        "dark": "#570c0c",
        "resolvedLight": "#570c0c",
        "resolvedDark": "#570c0c",
        "selector": "body",
        "darkSelector": "body[data-ds-dark-theme]",
        "themeInvariant": true,
        "referencedBy": []
      }
    },
    "dshVariables": {
      "--dsh-code-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-delta-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-content-font-size-secondary": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-code-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-font-family-text-default": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-border": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-thumb-hover": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-track-margin": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      },
      "--dsh-scrollbar-width": {
        "light": null,
        "dark": null,
        "notes": "declared by host sheets",
        "declared": true
      }
    }
  }
};

/** Exact host versions with a stock snapshot, ascending. */
export const STOCK_VERSIONS: readonly string[] = Object.keys(STOCK_BY_VERSION);

/** Resolve the stock snapshot for an exact host version. */
export function stockForVersion(version: string): StockSnapshot | undefined {
  return STOCK_BY_VERSION[version];
}

/** Light-mode raw token map for one host version. */
export function stockLightFor(version: string): TokenMap {
  const snapshot = STOCK_BY_VERSION[version];
  if (snapshot === undefined) return {};
  return Object.fromEntries(Object.entries(snapshot.tokens).map(([name, token]) => [name, token.light]));
}

/** Dark-mode raw token map for one host version. */
export function stockDarkFor(version: string): TokenMap {
  const snapshot = STOCK_BY_VERSION[version];
  if (snapshot === undefined) return {};
  return Object.fromEntries(Object.entries(snapshot.tokens).map(([name, token]) => [name, token.dark]));
}
