import { NS } from "@ns"

import { log, error } from "lib/log"

const scripts = [
    "managers/nodeupgrader.js",
    "managers/serverbuyer.js",
    "managers/nuker.js",
    "managers/batcher.js"
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

    for (const filename of scripts) {
        log(ns, `Checking with ${filename}...`)
        if (running.has(filename)) {
            log(ns, `Skipping ${filename}, already running`)
        } else {
            log(ns, `Starting ${filename}...`)
            if (!ns.run(filename)) {
                error(ns, `Unable to start ${filename}, check it exists on the current server`)
            }
        }
    }
}

