import { NS } from '@ns'
import { TargetServer } from '/lib/serverdata';
import { Allocation } from '/lib/allocation';
import { WorkType } from '/lib/worktype';
import { makeid } from '/lib/process';


export async function batchAllocations(ns: NS, target: string): Promise<Allocation[]> {
    const targetServer = new TargetServer(ns, target)

    const id = makeid(5)
    if (targetServer.isPrepared()) {
        return [{
            id: id,
            target: targetServer.hostname,
            threads: targetServer.money.hackThreads,
            completionTimeMs: targetServer.money.hackTimeMs,
            workType: WorkType.hacking,
            additionalTimeMs: 0
        }]
    } else if (targetServer.needsWeakining()) {
        return [{
            id: id,
            target: targetServer.hostname,
            threads: targetServer.security.weakenThreads,
            completionTimeMs: targetServer.money.hackTimeMs,
            workType: WorkType.weaking,
            additionalTimeMs: 0
        }]
    } else {
        return [{
            id: id,
            target: targetServer.hostname,
            threads: targetServer.money.growThreads,
            completionTimeMs: targetServer.money.hackTimeMs,
            workType: WorkType.growing,
            additionalTimeMs: 0
        }]
    }
    
}