#!/usr/bin/env node
/** Print the formal matrix evidence paths, one per line. */
import { matrixEvidence, readMatrix } from './release-lib.mjs'

for (const evidence of matrixEvidence(readMatrix())) console.log(evidence)
