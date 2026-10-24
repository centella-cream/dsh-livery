/**
 * Contract diff between two frozen snapshots.
 *
 * CI compares a base snapshot with a candidate. Only `required` differences
 * block a release: a token or hook that production code or the A-tier promise
 * actually consumes. Optional differences require a degradation test;
 * diagnostic-only changes are reported only.
 */
import type { ContractSnapshot } from './types.js'

export type DiffImpact = 'required' | 'optional' | 'diagnostic-only'

export interface ContractDiffEntry {
  readonly kind:
    | 'token-added'
    | 'token-removed'
    | 'token-changed'
    | 'platform-module-added'
    | 'platform-module-removed'
    | 'documented-attribute-added'
    | 'documented-attribute-removed'
    | 'layout-variable-added'
    | 'layout-variable-removed'
    | 'patch-key-added'
    | 'patch-key-removed'
    | 'host-service-changed'
    | 'event-changed'
    | 'locale-changed'
    | 'node-range-changed'
    | 'client-target-changed'
    | 'contract-hash-changed'
  readonly subject: string
  readonly impact: DiffImpact
  readonly before?: string
  readonly after?: string
}

export interface ContractDiff {
  readonly baseVersion: string
  readonly candidateVersion: string
  readonly baseHash: string
  readonly candidateHash: string
  readonly entries: readonly ContractDiffEntry[]
  readonly required: number
  readonly optional: number
  readonly diagnosticOnly: number
}

function setDiff<T>(before: readonly T[], after: readonly T[]): { added: T[]; removed: T[] } {
  const beforeSet = new Set(before)
  const afterSet = new Set(after)
  return {
    added: after.filter((value) => !beforeSet.has(value)),
    removed: before.filter((value) => !afterSet.has(value)),
  }
}

export function diffContracts(base: ContractSnapshot, candidate: ContractSnapshot): ContractDiff {
  const entries: ContractDiffEntry[] = []
  const consumed = new Set(candidate.tokens.consumed)
  const baseConsumed = new Set(base.tokens.consumed)

  const baseTokens = new Map(base.tokens.tokens.map((token) => [token.name, token]))
  const candidateTokens = new Map(candidate.tokens.tokens.map((token) => [token.name, token]))
  for (const [name, token] of candidateTokens) {
    const previous = baseTokens.get(name)
    if (previous === undefined) {
      entries.push({
        kind: 'token-added',
        subject: name,
        impact: consumed.has(name) ? 'optional' : 'diagnostic-only',
        after: token.light,
      })
      continue
    }
    if (previous.light !== token.light || previous.dark !== token.dark) {
      entries.push({
        kind: 'token-changed',
        subject: name,
        impact: consumed.has(name) || baseConsumed.has(name) ? 'required' : 'diagnostic-only',
        before: `${previous.light} / ${previous.dark}`,
        after: `${token.light} / ${token.dark}`,
      })
    }
  }
  for (const name of baseTokens.keys()) {
    if (!candidateTokens.has(name)) {
      entries.push({
        kind: 'token-removed',
        subject: name,
        impact: baseConsumed.has(name) ? 'required' : 'diagnostic-only',
      })
    }
  }

  const modules = setDiff(base.loaderAbi.platformModules.modules, candidate.loaderAbi.platformModules.modules)
  for (const moduleName of modules.removed) {
    entries.push({ kind: 'platform-module-removed', subject: moduleName, impact: 'required' })
  }
  for (const moduleName of modules.added) {
    entries.push({ kind: 'platform-module-added', subject: moduleName, impact: 'optional' })
  }

  const attributes = setDiff(base.layout.documentedAttributes, candidate.layout.documentedAttributes)
  for (const attribute of attributes.removed) {
    entries.push({ kind: 'documented-attribute-removed', subject: attribute, impact: 'required' })
  }
  for (const attribute of attributes.added) {
    entries.push({ kind: 'documented-attribute-added', subject: attribute, impact: 'optional' })
  }

  const variables = setDiff(base.layout.rootVariables, candidate.layout.rootVariables)
  for (const variable of variables.removed) {
    entries.push({ kind: 'layout-variable-removed', subject: variable, impact: 'optional' })
  }
  for (const variable of variables.added) {
    entries.push({ kind: 'layout-variable-added', subject: variable, impact: 'optional' })
  }

  const patchKeys = setDiff(base.profileSchema.patchKeys, candidate.profileSchema.patchKeys)
  for (const key of patchKeys.removed) {
    entries.push({ kind: 'patch-key-removed', subject: key, impact: 'required' })
  }
  for (const key of patchKeys.added) {
    entries.push({ kind: 'patch-key-added', subject: key, impact: 'optional' })
  }

  const baseServices = new Map(base.hostApi.services.map((service) => [service.service, service]))
  const candidateServices = new Map(candidate.hostApi.services.map((service) => [service.service, service]))
  for (const [service, signature] of candidateServices) {
    const previous = baseServices.get(service)
    if (previous === undefined) {
      entries.push({ kind: 'host-service-changed', subject: service, impact: 'required', after: signature.members.join('; ') })
      continue
    }
    const members = setDiff(previous.members, signature.members)
    if (members.removed.length > 0) {
      entries.push({
        kind: 'host-service-changed',
        subject: `${service}: ${members.removed.join('; ')}`,
        impact: 'required',
      })
    }
    if (members.added.length > 0) {
      entries.push({ kind: 'host-service-changed', subject: `${service}: +${members.added.join('; ')}`, impact: 'optional' })
    }
  }
  for (const service of baseServices.keys()) {
    if (!candidateServices.has(service)) {
      entries.push({ kind: 'host-service-changed', subject: `removed:${service}`, impact: 'required' })
    }
  }

  for (const [event, signature] of Object.entries(candidate.hostApi.events)) {
    if (base.hostApi.events[event] !== signature) {
      entries.push({ kind: 'event-changed', subject: event, impact: 'required' })
    }
  }

  const baseLocales = base.clientApi.locale.ids.join(',')
  const candidateLocales = candidate.clientApi.locale.ids.join(',')
  if (baseLocales !== candidateLocales) {
    entries.push({ kind: 'locale-changed', subject: 'locale ids', impact: 'required', before: baseLocales, after: candidateLocales })
  }

  if (base.source.nodeRange !== candidate.source.nodeRange) {
    entries.push({
      kind: 'node-range-changed',
      subject: 'engines.node',
      impact: 'required',
      before: base.source.nodeRange,
      after: candidate.source.nodeRange,
    })
  }
  if (base.source.clientTarget !== candidate.source.clientTarget) {
    entries.push({
      kind: 'client-target-changed',
      subject: 'clientTarget',
      impact: 'required',
      before: base.source.clientTarget,
      after: candidate.source.clientTarget,
    })
  }
  if (base.contractHash !== candidate.contractHash) {
    entries.push({ kind: 'contract-hash-changed', subject: 'contractHash', impact: 'required', before: base.contractHash, after: candidate.contractHash })
  }

  const count = (impact: DiffImpact): number => entries.filter((entry) => entry.impact === impact).length
  return {
    baseVersion: base.hostVersion,
    candidateVersion: candidate.hostVersion,
    baseHash: base.contractHash,
    candidateHash: candidate.contractHash,
    entries,
    required: count('required'),
    optional: count('optional'),
    diagnosticOnly: count('diagnostic-only'),
  }
}

export function renderDiffMarkdown(diff: ContractDiff): string {
  const lines = [
    `# Contract diff: ${diff.baseVersion} → ${diff.candidateVersion}`,
    '',
    `- base contract: \`${diff.baseHash}\``,
    `- candidate contract: \`${diff.candidateHash}\``,
    `- required: ${diff.required} · optional: ${diff.optional} · diagnostic-only: ${diff.diagnosticOnly}`,
    '',
    '| impact | kind | subject | before | after |',
    '|---|---|---|---|---|',
  ]
  for (const entry of diff.entries) {
    lines.push(
      `| ${entry.impact} | ${entry.kind} | ${entry.subject} | ${entry.before ?? ''} | ${entry.after ?? ''} |`,
    )
  }
  if (diff.entries.length === 0) lines.push('| — | no differences | — | — | — |')
  lines.push('')
  return lines.join('\n')
}
