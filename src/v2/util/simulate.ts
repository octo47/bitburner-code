import { NS } from '@ns'
import { Scanner } from "/lib/scanner";
import { HostData } from '/lib/hostdata';
import { ttabulate } from '/lib/tabulate';

type SecurityData = {
    minSecurity: number
    securityLevel: number
    maxThreads: number
}

class ServerData {
    public hostData: HostData
    public security: SecurityData

    constructor(ns: NS, hostData: HostData) {
        this.hostData = hostData
        this.security = newSecurityData(ns, hostData)
    }
}

class Simulator {

    private ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    simulate() {
        const scanner = new Scanner()

        const targets = scanner.scan(this.ns).hosts
            .map((hd) => new ServerData(this.ns, hd))

        ttabulate(this.ns, Array.from(targets))
    }
}

function newSecurityData(ns: NS, hostData: HostData): SecurityData {
    const weakenPerThread = ns.weakenAnalyze(1)
    const minLevel = ns.getServerMinSecurityLevel(hostData.hostname)
    const currentLevel = ns.getServerSecurityLevel(hostData.hostname)
    return {
        minSecurity: ns.getServerMinSecurityLevel(hostData.hostname),
        securityLevel: ns.getServerSecurityLevel(hostData.hostname),
        maxThreads: Math.ceil(Math.max(0, (currentLevel - minLevel)/weakenPerThread))
    }
}

export async function main(ns : NS) : Promise<void> {
    new Simulator(ns).simulate()
}