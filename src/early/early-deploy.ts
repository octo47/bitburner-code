import { NS, Server } from "@ns"
import { PortOpener } from "/lib/port_opener";
import { log, error } from "/lib/log";

const script = "early/early-hack.js"

// Servers which require no open ports
const earlyServers = [
    "foodnstuff",
    "joesguns",
    "nectar-net",
    "n00dles",
    "sigma-cosmetics",
    "harakiri-sushi",
    "hong-fang-tea",
];

function deploy(ns: NS, server: Server) {
    const po = new PortOpener(ns)
    const hostname = server.hostname
    log(ns, `Deploying to ${server.hostname}`)
    if (po.nuke(server)) {
        log(ns, `Nuked ${server.hostname}`)
        ns.scp(script, hostname)
        const ram = ns.getServerMaxRam(hostname)
        const scriptRam = ns.getScriptRam(script)
        const threads = Math.floor(ram/scriptRam)
        log(ns, `Running ${script} with ${threads} on ${server.hostname}`)
        const option = { preventDuplicates: true, threads: threads };
        if (!ns.exec(script, hostname, option, hostname)) {
            error(ns, `Failed to start ${script} with ${threads} on ${server.hostname}`)
        }
    }
}

export async function main(ns: NS) {


    for (const target of earlyServers) {
        const server = ns.getServer(target)
        deploy(ns, server)
    }
}