import { NS, Server } from '@ns'
import { Queue } from 'lib/queue'
import { ServerList } from '/lib/serverlist'
import { ServerData, TargetServer } from '/lib/serverdata'

export type ScannerConfig = {
    directConnected: boolean
}

export const defaultScannerConfig: ScannerConfig = {
    directConnected: false
}

type ScannedServer = {
    hostname: string
    server: Server
    path: string[]
}

export class Scanner {

    scan(ns: NS, config: ScannerConfig = defaultScannerConfig): ServerData[] {
        return this.scanHosts(ns, config)
            .map((host) => new ServerData(ns, host.hostname, host.path))
    }

    findTargets(ns: NS, config: ScannerConfig = defaultScannerConfig): TargetServer[] {
        return this.scanHosts(ns, config)
            .filter((host) => host.server.moneyMax ?? 0 > 0)
            .map((host) => new TargetServer(ns, host.hostname, host.path))
    }   

    scanHosts(ns: NS, config: ScannerConfig = defaultScannerConfig): ScannedServer[] {
        
        const toScan = new Queue<ScannedServer>()

        const visited = new Set<string>()
        const hosts: ScannedServer[] = []

        toScan.pushAll(ns.scan("home").map(host => { return {
            hostname: host,
            server: ns.getServer(host),
            path: []
        }}))

        do {
            const nextHost = toScan.pop()
            if (nextHost == null) {
                break
            }
            if (visited.has(nextHost.hostname)) {
                continue
            }
            visited.add(nextHost.hostname)
    
            const server = ns.getServer(nextHost.hostname)
            hosts.push(nextHost)
    
            // only traverse to a next host only if 
            if (! config.directConnected 
                || server.backdoorInstalled 
                || server.purchasedByPlayer) {
                const scanned = ns.scan(server.hostname)
                toScan.pushAll(scanned.map((elem) => {
                    return {
                        hostname: elem,
                        server: ns.getServer(elem),
                        path: nextHost.path.concat([nextHost.hostname])
                    }
                }))
            }
        } while (!toScan.isEmpty())
        return hosts
    }

}