import { NS } from '@ns'
import { Scanner } from '/lib/scanner'
import { ServerList } from '/lib/serverlist';
import { PortOpener } from '/lib/port_opener'

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
        const scanner = new Scanner()
        const hosts = await scanner.scan(ns)

        const toHack= hosts.filter((elem) => elem.hacked == false)

        const hackingLevel = ns.getPlayer().skills.hacking
        let hacked = false
        const po = new PortOpener(ns)
        for (const idx in toHack) {
            const hostPath = toHack[idx]
            if (hostPath.hacked) {
                continue
            }

            const server = ns.getServer(hostPath.hostname)

            if (!server.requiredHackingSkill) {
                continue
            }

            if (server.requiredHackingSkill  > hackingLevel) {
                ns.printf("%s TOO WEAK: %d < %d", 
                    server.hostname, hackingLevel, 
                    server.requiredHackingSkill)
                continue
            }

            if (po.open(server)) {
                ns.nuke(hostPath.hostname)
                if (ns.getServer(hostPath.hostname).hasAdminRights) {
                    ns.printf("%s succesfully rooted", hostPath.hostname)
                    hacked = true
                }
            } else {
                ns.printf("%s failed to open", hostPath.hostname)
            }
        }

        new ServerList(hosts).save(ns)

        if (!hacked) {
            ns.printf("nothing rooted, sleeping")
            await ns.sleep(60000)
        }
    }

}
