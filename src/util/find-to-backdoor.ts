import { NS } from '@ns'
import { Scanner } from '/lib/scanner'
import { ttabulate } from '/lib/tabulate'

export async function main(ns : NS) : Promise<void> {
    
    type ServerRow = {
        hostname: string,
        command: string
    }

    let servers: ServerRow[] = Array.from(
        (await new Scanner()
        .scan(ns))
        .filter((srv) => !srv.owned)
        .filter((srv) => srv.hacked)
        .filter((srv) => !srv.backdoor))
        .map((srv) => {
            const connection = srv.path.map((s) => `connect ${s};`).join(" ")
            return {
                hostname: srv.hostname,
                command: `home; ${connection} connect ${srv.hostname}; backdoor;`
        }})

    servers.sort((a, b) => a.hostname.localeCompare(b.hostname))

    if (ns.args.length === 1) {
        servers = servers.filter((srv) => srv.hostname === ns.args[0])
    }

    ttabulate(ns, servers)
}