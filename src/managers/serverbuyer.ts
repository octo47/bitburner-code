import { NS, Server } from "@ns"

import { tabulate } from "/lib/tabulate"
import { log } from "/lib/log"
import { Stopwatch } from "/lib/time"

const prefix = "aaa-worker-"

class ServerBuyer {
    private ns: NS

    private nameCounter = 1
    private multi = 2
    private maxRam: number
    private maxServers: number
    private lastTimeTried = new Date().getTime()


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

    canBuyMore() {
        return Math.pow(2, this.multi) >= this.maxRam
    }

    dashboard() {

        this.ns.clearLog()

        const servers = this.ns.getPurchasedServers()
            .map((name) => this.ns.getServer(name));

        servers.sort((a, b) => a.ramUsed - b.ramUsed)

        const triedSince = this.ns.tFormat(
            new Date().getTime() - this.lastTimeTried)

        const ram = Math.pow(2, this.multi)
        const cost = this.ns.getPurchasedServerCost(ram)
    
        this.ns.print("Server Buyer")
        this.ns.print(`   NextName: ${this.nextName()}`)
        this.ns.print(`   Multiplier: ${this.multi}`)
        this.ns.print(`   CurrentRAM: ${ram}`)
        this.ns.print(`   MaxRAM: ${this.maxRam}`)
        this.ns.print(`   Cost: ${this.ns.formatNumber(cost)}`)
        this.ns.print(`   Last Time Tried: ${triedSince}`)

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
    
        tabulate(this.ns, rows)
    }

    tryToBuyOrUpgrade() {
    
        this.lastTimeTried = new Date().getTime()

        const servers: Server[] = this.ns.getPurchasedServers()
            .map((name) => this.ns.getServer(name));

        // put smallest in front
        servers.sort((a, b) => a.maxRam - b.maxRam)

        if (!this.canBuyMore()) {
            log(this.ns, `Can't buy more`)
            return
        }
    
        const cash = this.ns.getPlayer().money
        const ram = Math.pow(2, this.multi)
        const cost = this.ns.getPurchasedServerCost(ram)
    
        if (cash < cost) {
            return
        }

        if (servers.length < this.maxServers) {
            this.buyServer()
        } else {
            const smallest = servers[0]
            const currentRAM = Math.min(this.maxRam, Math.pow(2, this.multi))

            if (currentRAM <= this.ns.getServerMaxRam(smallest.hostname)) {
                this.multi++
            }
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
        const stopwatch = new Stopwatch(ns)
        if (serverBuyer.canBuyMore() && stopwatch.elapsedMs() > 60 * 1000) {
            serverBuyer.tryToBuyOrUpgrade()
        }
        serverBuyer.dashboard()
        await ns.sleep(1000)
    }
}

function pad(num: number, size: number): string {
    const s = "000000000" + num
    return s.substr(s.length-size)
}

