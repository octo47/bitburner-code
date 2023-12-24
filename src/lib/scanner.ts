import { NS } from '@ns'
import { Queue } from 'lib/queue'
import { ServerList } from '/lib/serverlist'
import { ServerData } from '/lib/serverdata'

export type ScannerConfig = {
    directConnected: boolean
}

export const defaultScannerConfig: ScannerConfig = {
    directConnected: false
}

export class Scanner {

    scan(ns: NS, config: ScannerConfig = defaultScannerConfig): ServerList {
        
        const toScan = new Queue<ServerData>()

        const visited = new Set<string>()
        const hosts: ServerData[] = []

        toScan.pushAll(ns.scan("home").map(host => { return new ServerData(ns, host, [])}))

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
            nextHost.hacked = server.hasAdminRights
            nextHost.owned = server.purchasedByPlayer
            nextHost.backdoor = server.backdoorInstalled ?? false
            hosts.push(nextHost)
    
            // only traverse to a next host only if 
            if (! config.directConnected 
                || server.backdoorInstalled 
                || server.purchasedByPlayer) {
                const scanned = ns.scan(server.hostname)
                toScan.pushAll(scanned.map((elem) => {
                    return new ServerData(ns, elem, nextHost.path.concat([nextHost.hostname]))
                }))
            }
        } while (!toScan.isEmpty())
        return new ServerList(hosts.filter((elem) => elem.hostname !== "home"))
    }
}