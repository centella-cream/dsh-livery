#!/usr/bin/env node
/** Print formal-matrix evidence paths for the current package version. */
import { readFileSync } from 'node:fs'
import { matrixEvidence, readMatrix, readPackageJson } from './release-lib.mjs'

const version = readPackageJson().version
for (const evidence of matrixEvidence(readMatrix())) {
  const document = JSON.parse(readFileSync(evidence, 'utf8'))
  if (document.packageVersion === version) console.log(evidence)
}
