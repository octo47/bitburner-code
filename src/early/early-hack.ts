import { NS } from "@ns"


// Script for early hacking,
// this script is intended to be small and simple.
export async function main(ns: NS) {
    const target = ns.args[0].toString();

    // Minimum threshold for a server money. 
    // Only hack() if it has more then this threshold.
    const minMoney = Math.floor(ns.getServerMaxMoney(target) * 0.75);

    // Target security level target will be weakend first.
    const minSecurity = ns.getServerMinSecurityLevel(target) + 5;

    // Continuously hack/grow/weaken the target server.
    for (;;) {
        const money = ns.getServerMoneyAvailable(target);
        if (ns.getServerSecurityLevel(target) > minSecurity) {
            await ns.weaken(target);
        } else if (money < minMoney) {
            await ns.grow(target);
        } else {
            await ns.hack(target);
        }
    }
}