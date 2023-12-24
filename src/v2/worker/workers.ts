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