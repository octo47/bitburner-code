import { NS } from '@ns'
import { Allocation } from './allocation';
import { error } from '/lib/log';
import { Scanner } from '/lib/scanner';
import { ServerData } from '/lib/serverdata';
import { SetWithContentEquality } from '/lib/set';
import { Stopwatch } from '/lib/time';
import { tabulate } from '/lib/tabulate';
import { workerRAM, workerTypeRAM, workTypeName, workTypeScriptName } from '/lib/worktype';

type ServerAssignment = {
    worker: string
    threads: number
    allocation: Allocation
}

type WorkerData = {
    hostname: string
    availableRAM: number
}

type AllocationState = {
    allocation: Allocation
    wokersThreads: {[id: string]: number}
}

export class Botnet {

    private ns: NS;
    private started: Stopwatch
    private availableRAM = 0
    private totalRAM = 0

    private homeReserveGB = 32

    private workers: WorkerData[] = []
    private allocations: {[id: string]: AllocationState} = {}
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

    private async allocateWorkers(allocation: Allocation): Promise<ServerAssignment[]> {
        const assignments: ServerAssignment[] = []

        let requiredThreads = allocation.threads
        let allocatedThreads = 0
        const scriptRam = workerTypeRAM(this.ns, allocation.workType)

        // sort to have most ram on top
        this.workers.sort((a, b) => a.availableRAM - b.availableRAM)

        for (const worker of this.workers) {
            let workerRAMLeft = worker.availableRAM
            let threadsOnWorker = 0
            while (workerRAMLeft > scriptRam && requiredThreads > 0) {
                workerRAMLeft -= scriptRam
                requiredThreads -= 1
                threadsOnWorker += 1
            }
            if (threadsOnWorker > 0) {
                assignments.push({
                    worker: worker.hostname,
                    threads: threadsOnWorker,
                    allocation: allocation,
                })
                allocatedThreads += threadsOnWorker
            }
            if (requiredThreads === 0) {
                break
            }
        }
        if (allocatedThreads/requiredThreads < 0.2) {
            // do not schedule less then 20% requested threads
            return []
        }
        return assignments
    }

    public async refresh() {

        this.workers = []
        this.targets.clear()
        this.allocations = {}
        this.totalRAM = 0
        this.availableRAM = 0

        const bots: ServerData[] = this.ns.getPurchasedServers()
            .map((name) => new ServerData(this.ns, name))

        const scanner = new Scanner()
        const hackedServers = (await scanner.scan(this.ns))
            .filter((sd) => sd.owned || sd.hacked)
        hackedServers.forEach((srv) => bots.push(srv))

        for (const sd of bots) {
            const server = this.ns.getServer(sd.hostname)
            let ramAvail = server.maxRam - server.ramUsed
            let serverMaxRam = server.maxRam

            // amke sure we have a reserve on our home machine
            if (sd.hostname === "home") {
                ramAvail -= this.homeReserveGB
                serverMaxRam -= this.homeReserveGB
                if (ramAvail < 0) {
                    continue
                }
            }

            this.totalRAM += serverMaxRam
            this.workers.push({
                hostname: server.hostname,
                availableRAM: ramAvail
            })
            this.availableRAM += ramAvail
            
            const assingments = await this.findRunningAllocations(sd.hostname)
            for(const assingment of assingments) {
                let merged = this.allocations[assingment.allocation.id]
                if (merged === undefined) {
                    merged = {
                        allocation: assingment.allocation,
                        wokersThreads: {}
                    }
                } 
                merged.wokersThreads[assingment.worker] = assingment.threads
                this.allocations[assingment.allocation.id] = merged
                this.targets.add(assingment.allocation.target)
            }
        }
    }

    private async findRunningAllocations(worker: string): Promise<ServerAssignment[]> {

        const allocations = new SetWithContentEquality<ServerAssignment>((item) => item.allocation.id)

        this.ns.ps(worker).forEach((pi) =>  {
            if (pi.args.length == 4 && pi.args[2] === "allocation") {
                const allocationJSON = pi.args[3].toString()
                if (allocationJSON === undefined) {
                    error(this.ns, `Unexpceted: not found allocation on ${worker}: ${JSON.stringify(pi)}`)
                }
                const parsedAllocation = JSON.parse(allocationJSON)
                allocations.add({
                    allocation: parsedAllocation,
                    worker: worker,
                    threads: pi.threads
                })
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

        this.ns.print(`Active allocations:`)

        type AllocationRow = {
            id: string
            target: string
            requestedThreads: number
            runningThreads: number
            batchTimeLeft: string
            estimatedTotalTime: string
            workType: string
        }

        const allocations =  Array.from(Object.values(this.allocations))
        allocations.sort((a, b) => a.allocation.completionTimeMs - b.allocation.completionTimeMs)

        const now = new Date().getTime()

        const rows: AllocationRow[] = allocations.map((alloc) => { 
            const allocation = alloc.allocation
            const runningThreds = Object.values(alloc.wokersThreads).reduce((acc, ram) => acc + ram, 0)
            const totalTime = allocation.threads / runningThreds * allocation.completionTimeMs
            return {
            id: allocation.id,
            target: allocation.target,
            requestedThreads: allocation.threads,
            runningThreads: runningThreds,
            batchTimeLeft: this.ns.tFormat(allocation.completionTimeMs - (now - allocation.created)),
            estimatedTotalTime: this.ns.tFormat(totalTime), 
            workType: workTypeName(allocation.workType)
        }})

        tabulate(this.ns, rows)
    }

    public hasCapacity(): boolean {
        return this.availableRAM >= workerRAM(this.ns)
    }

}

