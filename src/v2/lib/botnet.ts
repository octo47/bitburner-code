import { NS } from '@ns'
import { workerRAM, workerTypeRAM, workTypeScriptName } from '/v2/lib/worktype';
import { Scanner } from '/lib/scanner';
import { ServerData } from '/lib/serverdata';
import { Stopwatch } from '/lib/time';
import { Allocation } from '/v2/lib/allocation';
import { tabulate, ttabulate } from '/lib/tabulate';
import { error, log } from '/lib/log';
import { SetWithContentEquality } from '/lib/set';

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
    public allocations = new SetWithContentEquality<Allocation>((item) => item.id)
    public targets = new Set<string>()

    public constructor(ns: NS) {
        this.ns = ns
        this.started = new Stopwatch(ns)

        this.refreshWorkers()
    }

    public async startAllocations(allocations: Allocation[]) {
        const assignments: ServerAssignment[] = []
        await this.refreshWorkers()
        for (const allocation of allocations) {
            const allocated = await this.allocateWorkers(allocation)
            allocated
                .forEach((elem) => assignments.push(elem))
        }

        ttabulate(this.ns, assignments)

        for (const assignment of assignments) {
            await this.execute(assignment)
        }
    }

    private async allocateWorkers(allocation: Allocation): Promise<ServerAssignment[]> {
        const assignments: ServerAssignment[] = []

        log(this.ns, `Allocating workers.`)

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

    private async refreshWorkers() {

        this.workers.clear()
        this.targets.clear()
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

        const allocations = new Set<Allocation>()

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
        let result = "launched"
        if (!this.ns.exec(script, server, 
                assignment.threads, 
                allocation.target, 
                allocation.additionalTimeMs ?? 0,
                "allocation",
                JSON.stringify(assignment.allocation))) {
                result = "failed"
        }
        log(this.ns, JSON.stringify({
            "action": result,
            "server": server,
            "allocation": allocation
        }))
    }

    public report() {
        this.ns.print(`Botnet: running for ${this.started.elapsedFormatted()}`)
        this.ns.print(`RAM: used ${this.totalRAM-this.availableRAM}Gb of ${this.totalRAM}Gb`)

        this.ns.print(`Active allocations`)
        tabulate(this.ns, Array.from(this.allocations.values()))
    }

    public hasCapacity(): boolean {
        return this.availableRAM >= workerRAM(this.ns)
    }

}

