import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    
    for (const server of ns.getPurchasedServers()) {
        ns.killall(server)
        ns.deleteServer(server)
    }
}