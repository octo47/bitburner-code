import { BasicHGWOptions, NS } from '@ns'

/**
 * Hack money on a target server.  The script accepts these arguments:
 *
 * (1) target := Hostname of the server to target.
 * (2) waitTimeMs := Additional amount of time (in milliseconds) to wait before
 *     the hack operation completes.
 *
 * Usage: run /v2/worker/hack_once.js [target] [waitTimeMs]
 * Example: run /v2/worker/hack_once.js n00dles 42
 *
 * @param {NS} ns The Netscript API.
 */
export async function main(ns : NS) : Promise<void> {
    const target = ns.args[0].toString()
    if (ns.args.length > 1) {
        const option: BasicHGWOptions = {
            additionalMsec: Math.floor(Number(ns.args[1]))
        }
        await ns.hack(target, option)
    } else {
        await ns.hack(target)
    }
}