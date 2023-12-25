import { NS } from '@ns'

const workerGrow = "/v2/worker/grow_once.js"
const workerHack = "/v2/worker/hack_once.js"
const workerWeaken = "/v2/worker/weaken_once.js"

export enum WorkType {
    weaking,
    growing,
    hacking,
}

export const allWorkTypes: WorkType[] = [
    WorkType.weaking,
    WorkType.growing,
    WorkType.hacking,
]

export function workTypeScriptName(type: WorkType): string {
    switch(type) {
        case WorkType.hacking: return workerHack; break
        case WorkType.growing: return workerGrow; break
        case WorkType.weaking: return workerWeaken; break
        default: throw `Unknown work type ${type}`
    }
}

export function scriptWorkType(script: string): WorkType | undefined {
    switch(script) {
        case workerHack: return WorkType.hacking; break
        case workerGrow: return WorkType.growing; break
        case workerWeaken: return WorkType.weaking; break
        default: return undefined
    }
}

export function workerRAM(ns: NS): number {
    return Math.max(...allWorkTypes
        .map((wt) => workTypeScriptName(wt))
        .map((path) => ns.getScriptRam(path)))
}

export function workerTypeRAM(ns: NS, workType: WorkType): number {
    const script = workTypeScriptName(workType)
    const scriptRam = ns.getScriptRam(script)
    if (scriptRam === 0) {
        throw `Script not found to measure RAM requirements: script ${script} for ${workType}`
    }
    return scriptRam
}