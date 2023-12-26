import { NS } from "@ns"

import { log, error } from "lib/log"

type Script = {
    isNeeded: (ns: NS) => boolean
    scriptName: string
}

const scripts: Script[] = [
    {
        isNeeded: (ns) => ns.getPlayer().money > 1*1024*1024*1024,
        scriptName: "managers/nodeupgrader.js",
    },
    {
        isNeeded: (ns) => ns.getPlayer().money > 20*1024*1024*1024,
        scriptName: "managers/serverbuyer.js",
    },
    {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isNeeded: (ns) => true,
        scriptName: "managers/nuker.js",
    },
    {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isNeeded: (ns) => true,
        scriptName: "managers/batcher.js",
    },
]

export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    ns.disableLog("asleep")

    log(ns, "Starting all scripts.")

    const running = new Set(
        ns.ps()
          .map((pi) => pi.filename
    ))

    for (const script of scripts) {
        log(ns, `Checking with ${script.scriptName}...`)
        if (!script.isNeeded(ns)) {
            log(ns, `Skipping ${script.scriptName}, is not yet needed`)
            continue
        }
        if (running.has(script.scriptName)) {
            log(ns, `Skipping ${script.scriptName}, already running`)
        } else {
            log(ns, `Starting ${script.scriptName}...`)
            if (!ns.run(script.scriptName)) {
                error(ns, `Unable to start ${script.scriptName}, check it exists on the current server`)
            }
        }
    }
}

