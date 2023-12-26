import { NS, Server } from "@ns"

import { tabulate } from "/lib/tabulate"
import { Stopwatch } from "/lib/time"

const prefix = "aaa-worker-"

class ServerBuyer {
    private ns: NS

    private nameCounter = 1
    private multi = 2
    private maxRam: number
    private maxServers: number
    private sinceLastRun: Stopwatch | undefined
    private decision: string | undefined


    constructor(ns: NS) {
        this.ns = ns
        this.maxRam = ns.getPurchasedServerMaxRam()
        this.maxServers = ns.getPurchasedServerLimit()

        const servers = this.ns.getPurchasedServers()
            .map((name) => this.ns.getServer(name))


        if (servers.length > 0) {
            const maxRam = servers.reduce((a, e) => Math.max(a, e.maxRam), 3)

            while (Math.pow(2, this.multi) < maxRam) this.multi++

            this.nameCounter = Math.max(0, ...servers
                .map((srv) => +srv.hostname.replace(prefix, "")))+1
        }
    
        while (ns.getPurchasedServerCost(Math.pow(2, this.multi)) < ns.getPlayer().money) 
            this.multi++
        this.multi = Math.max(2, this.multi-1)
    }

    dashboard() {

        this.ns.clearLog()

        const servers = this.ns.getPurchasedServers()
            .map((name) => this.ns.getServer(name));

        servers.sort((a, b) => a.ramUsed - b.ramUsed)

        const triedSince = this.sinceLastRun?.elapsedFormatted()

        const ram = Math.pow(2, this.multi)
        const cost = this.ns.getPurchasedServerCost(ram)
    
        this.ns.print("Server Buyer")
        this.ns.print(`   NextName: ${this.nextName()}`)
        this.ns.print(`   Multiplier: ${this.multi}`)
        this.ns.print(`   CurrentRAM: ${ram}`)
        this.ns.print(`   MaxRAM: ${this.maxRam}`)
        this.ns.print(`   Cost: ${this.ns.formatNumber(cost)}`)
        this.ns.print(`   Last Time Tried: ${triedSince}`)
        this.ns.print(`   Buying decision: ${this.decision}`)

        type Row = {
            hostname: string
            ramMax: string
            ramUsed: string
            cpu: number
        }

        const rows: Row[] = servers.map((server) => {
            return {
                hostname: server.hostname,
                ramMax: this.ns.formatRam(server.maxRam),
                ramUsed: this.ns.formatRam(server.ramUsed),
                cpu: server.cpuCores,
            }
        })
        rows.sort((a, b) => b.ramUsed.localeCompare(a.ramUsed))
    
        tabulate(this.ns, rows)
    }

    tryToBuyOrUpgrade() {
    
        if (this.sinceLastRun?.elapsedMs ?? 60000 < 60000) {
            return
        }
        this.sinceLastRun = new Stopwatch(this.ns)

        const servers: Server[] = this.ns.getPurchasedServers()
            .map((name) => this.ns.getServer(name));

        // put smallest in front
        servers.sort((a, b) => a.maxRam - b.maxRam)

        if (Math.pow(2, this.multi) > this.maxRam) {
            this.decision = `Reached maximum possible memory: ${this.maxRam}`
            return
        }
    
        const cash = this.ns.getPlayer().money
        const ram = Math.pow(2, this.multi)
        const cost = this.ns.getPurchasedServerCost(ram)
    
        const currentlyUsedRAM = servers.reduce((accum, srv) => accum + srv.ramUsed, 0)
        const currentlyAvailableRAM = servers.reduce((accum, srv) => accum + srv.maxRam, 0)

        if (currentlyAvailableRAM > 0 || currentlyUsedRAM / currentlyAvailableRAM < 0.8) {
            this.decision = `Low utilization: <${Math.floor(currentlyUsedRAM / currentlyAvailableRAM * 100)}%`
            return
        }

        if (cash < cost) {
            this.decision = `Not enough money: ${cash} < ${cost}`
            return
        }

        if (servers.length < this.maxServers) {
            this.decision = `Purchased ${this.nextName()}`
            this.buyServer()
        } else {
            const smallest = servers[0]
            const currentRAM = Math.min(this.maxRam, Math.pow(2, this.multi))

            if (currentRAM <= this.ns.getServerMaxRam(smallest.hostname)) {
                this.multi++
            }
            this.decision = `Replaced ${smallest.hostname} with ${this.nextName()}`
            this.replaceServer(smallest.hostname)
        }

    }

    buyServer() {
        const ram = Math.pow(2, this.multi)
        const name = this.nextName()
        this.nameCounter++
        this.ns.purchaseServer(name, ram)
    }

    replaceServer(serverName: string) {
        this.ns.killall(serverName)
        this.ns.deleteServer(serverName)
        this.buyServer()
    }
    
    nextName(): string {
        return prefix + pad(this.nameCounter, 8)
    }
}


export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    ns.disableLog("asleep")

    const serverBuyer = new ServerBuyer(ns)

    // eslint-disable-next-line no-constant-condition
    while(true) {
        serverBuyer.tryToBuyOrUpgrade()
        serverBuyer.dashboard()
        await ns.sleep(1000)
    }
}

function pad(num: number, size: number): string {
    const s = "000000000" + num
    return s.substr(s.length-size)
}

