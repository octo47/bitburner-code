import { NS } from '@ns'
import { workerRAM } from '/v2/lib/workers';
import { Scanner } from '/lib/scanner';
import { ServerData } from '/lib/serverdata';
import { Stopwatch } from '/lib/time';

export class Botnet {

    private ns: NS;
    private started: Stopwatch
    private availableRAM = 0
    private totalRAM = 0
    private workers: Map<string, number> = new Map<string, number>()
    
    constructor(ns: NS) {
        this.ns = ns
        this.started = new Stopwatch(ns)

        this.refreshWorkers()
    }

    refreshWorkers() {
        let bots: ServerData[] = this.ns.getPurchasedServers()
            .map((name) => new ServerData(this.ns, name))

        if (bots.length === 0) {
            // no bots? using hacked servers instead
            const scanner = new Scanner()
            bots = scanner.scan(this.ns)
                .filter((sd) => sd.owned || sd.hacked)
        }
        bots.forEach((sd) => {
            const server = this.ns.getServer(sd.hostname)
            const ramAvail = server.maxRam - server.ramUsed
            this.totalRAM += server.maxRam
            this.workers.set(sd.hostname, ramAvail)
            this.availableRAM += ramAvail
        }) 
    }

    report() {
        this.ns.print(`Botnet: running for ${this.started.elapsedFormatted()}`)
        this.ns.print(`RAM: used ${this.totalRAM-this.availableRAM}Gb of ${this.totalRAM}Gb`)

        this.workers.forEach((ram, name) => {
            if (ram > 0) {
                this.ns.print(`${name} -> ${ram}Gb`)
            }
        })
    }

    hasCapacity(): boolean {
        return this.availableRAM >= workerRAM(this.ns)
    }

}
