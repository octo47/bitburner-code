import { NS } from '@ns'

import { PortOpener } from '/lib/port_opener'
import { Scanner } from '/lib/scanner'
import { ServerList } from '/lib/serverlist'
import { tabulate } from '/lib/tabulate';

export async function main(ns : NS) : Promise<void> {

    ns.disableLog("disableLog");
    ns.disableLog("getServerMaxMoney");
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("getServerUsedRam");
    ns.disableLog("getServerMinSecurityLevel");
    ns.disableLog("getServerSecurityLevel");
    ns.disableLog("getServerGrowth");
    ns.disableLog("scan");
    ns.disableLog("sleep");

    // eslint-disable-next-line no-constant-condition
    while (true) {

        ns.clearLog()

        const scanner = new Scanner()
        const hosts = await scanner.scan(ns)

        const servers = hosts.map((hd) => ns.getServer(hd.hostname))
            .filter((srv) => !srv.purchasedByPlayer)

        const toHack= hosts
            .filter((elem) => elem.hacked == false)
            .map((serverData) => ns.getServer(serverData.hostname))

        const hackingLevel = ns.getPlayer().skills.hacking
        const po = new PortOpener(ns)

        for (const server of toHack) {
            if (!server.requiredHackingSkill) {
                continue
            }

            if (server.requiredHackingSkill  > hackingLevel) {
                continue
            }

            if (po.open(server)) {
                ns.nuke(server.hostname)
            }       
        }

        type DashboardRow = {
            hostname: string
            hackingLevel: number
            ramGB: string,
            cores: number,
            status: string
        }

        const dashboard: DashboardRow[] = Array.from(servers.map((srv) =>{
            return {
                hostname: srv.hostname,
                hackingLevel: srv.requiredHackingSkill ?? 0,
                ramGB: ns.formatNumber(srv.maxRam),
                cores: srv.cpuCores,
                status: po.status(srv)
            }
        }))

        dashboard.sort((a, b) => a.hostname.localeCompare(b.hostname))

        tabulate(ns, dashboard)

        await ns.sleep(10000)
    }

}
