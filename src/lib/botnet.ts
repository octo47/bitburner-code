import { NS } from '@ns'
import { Allocation } from './allocation';
import { error } from '/lib/log';
import { Scanner } from '/lib/scanner';
import { ServerData } from '/lib/serverdata';
import { SetWithContentEquality } from '/lib/set';
import { Stopwatch } from '/lib/time';
import { tabulate } from '/lib/tabulate';
import { workerRAM, workerTypeRAM, workTypeScriptName } from '/lib/worktype';

type ServerAssignment = {
    worker: string
    threads: number
    allocation: Allocation
}

export class Botnet {

    private ns: NS;
    private started: Stopwatch
    private availableRAM = 0
    private totalRAM = 0

    private workers = new Map<string, number>()
    private allocations = new SetWithContentEquality<Allocation>((item) => item.id)
    private targets = new Set<string>()

    public constructor(ns: NS) {
        this.ns = ns
        this.started = new Stopwatch(ns)

        this.refresh()
    }

    public async startAllocations(allocations: Allocation[]) {
        const assignments: ServerAssignment[] = []
        await this.refresh()
        for (const allocation of allocations) {
            const allocated = await this.allocateWorkers(allocation)
            allocated
                .forEach((elem) => assignments.push(elem))
        }
        for (const assignment of assignments) {
            await this.execute(assignment)
        }
    }

    public async activeTargets(): Promise<Set<string>> {
        await this.refresh()
        return new Set(this.targets)
    }

    public async targetAllocations(target: string): Promise<Allocation[]> {
        await this.refresh()
        return Array.from(this.allocations.values()
            .filter((item) => item.target === target))
    }

    private async allocateWorkers(allocation: Allocation): Promise<ServerAssignment[]> {
        const assignments: ServerAssignment[] = []

        let requiredThreads = allocation.threads
        // TODO: use
        const scriptRam = workerTypeRAM(this.ns, allocation.workType)
        for (const [worker, workerRAM] of this.workers) {
            let workerRAMLeft = workerRAM
            let threadsOnWorker = 0
            while (workerRAMLeft > scriptRam && requiredThreads > 0) {
                workerRAMLeft -= scriptRam
                requiredThreads -= 1
                threadsOnWorker += 1
            }
            if (threadsOnWorker > 0) {
                assignments.push({
                    worker: worker,
                    threads: threadsOnWorker,
                    allocation: allocation,
                })
            }
            if (requiredThreads === 0) {
                break
            }
        }
        return assignments
    }

    public async refresh() {

        this.workers.clear()
        this.targets.clear()
        this.allocations.clear()
        this.totalRAM = 0
        this.availableRAM = 0

        let bots: ServerData[] = this.ns.getPurchasedServers()
            .map((name) => new ServerData(this.ns, name))

        if (bots.length === 0) {
            // no bots? using hacked servers instead
            const scanner = new Scanner()
            bots = (await scanner.scan(this.ns))
                .filter((sd) => sd.owned || sd.hacked)
        }
        for (const sd of bots) {
            const server = this.ns.getServer(sd.hostname)
            const ramAvail = server.maxRam - server.ramUsed
            this.totalRAM += server.maxRam
            this.workers.set(sd.hostname, ramAvail)
            this.availableRAM += ramAvail
            
            const runningAllocations = await this.findRunningAllocations(sd.hostname)
            for(const allocation of runningAllocations) {
                this.allocations.add(allocation)
                this.targets.add(allocation.target)
            }
        }
    }

    private async findRunningAllocations(worker: string): Promise<Allocation[]> {

        const allocations = new SetWithContentEquality<Allocation>((item) => item.id)

        this.ns.ps(worker).forEach((pi) =>  {
            if (pi.args.length == 4 && pi.args[2] === "allocation") {
                const allocationJSON = pi.args[3].toString()
                if (allocationJSON === undefined) {
                    error(this.ns, `Unexpceted: not found allocation on ${worker}: ${JSON.stringify(pi)}`)
                }
                allocations.add(JSON.parse(allocationJSON))
            }
        })
        return Array.from(allocations.values())

    }

    async execute(assignment: ServerAssignment) {
        const allocation = assignment.allocation
        const server = assignment.worker
        const script = workTypeScriptName(allocation.workType)
        if (!this.ns.scp(script, server)) {
            throw `Failed to copy ${script} to ${server}`
        }
        if (!this.ns.exec(script, server, 
                assignment.threads, 
                allocation.target, 
                allocation.additionalTimeMs ?? 0,
                "allocation",
                JSON.stringify(assignment.allocation))) {
                error(this.ns, JSON.stringify({
                    "server": server,
                    "allocation": allocation
                }))
        }
    }

    public async report() {
        this.ns.print(`Botnet: running for ${this.started.elapsedFormatted()}`)
        this.ns.print(`RAM: used ${Math.floor(this.totalRAM-this.availableRAM)}Gb of ${this.totalRAM}Gb`)

        this.ns.print(`Active allocations`)
        const allocations =  Array.from(this.allocations.values())
        allocations.sort((a, b) => a.completionTimeMs - b.completionTimeMs)
//        allocations.sort((a, b) => a.target.localeCompare(b.target))
        tabulate(this.ns, allocations)
    }

    public hasCapacity(): boolean {
        return this.availableRAM >= workerRAM(this.ns)
    }

}

