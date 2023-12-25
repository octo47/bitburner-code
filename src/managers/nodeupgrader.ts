import { NS } from '@ns'
import { tabulate } from '/lib/tabulate';

const targetNodes = 40
const targetCores = 16
const targetRam = 64
const targetLevel = 200   
const upgradeLevels = 10
const upgradeRam = 2
const upgradeCores = 1


async function tryAction(ns: NS): Promise<void> {
    const hacknet = ns.hacknet
    const myMoney = (): number => {
        return ns.getPlayer().money
    }

    if(hacknet.numNodes() < targetNodes) {
        const cost = hacknet.getPurchaseNodeCost()
        if (myMoney() > cost) {
            hacknet.purchaseNode()
        }
    }

    for (let i = 0; i < hacknet.numNodes(); i++) {
        if (hacknet.getNodeStats(i).level <= targetLevel) {
            const cost = hacknet.getLevelUpgradeCost(i, upgradeLevels)
            if (myMoney() > cost) {
                hacknet.upgradeLevel(i, upgradeLevels)
            }
        }
    }

    for (let i = 0; i < hacknet.numNodes(); i++) {
        if (hacknet.getNodeStats(i).ram < targetRam) {
            const cost = hacknet.getRamUpgradeCost(i, 2)
            if (myMoney() > cost) {
                hacknet.upgradeRam(i, upgradeRam)
            }
        }
    }
    
    for (let i = 0; i < hacknet.numNodes(); i++) {
        if (hacknet.getNodeStats(i).cores < targetCores) {
            const cost = hacknet.getCoreUpgradeCost(i, 1)
            if (myMoney() > cost) {
                hacknet.upgradeCore(i, upgradeCores)
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns : NS) : Promise<void> {

    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    
    // eslint-disable-next-line no-constant-condition
    while(true) {
        try {
            await tryAction(ns)
            await printDashboard(ns)
        } catch (e) {
            if (typeof e === "string") {
                ns.print(e.toUpperCase())
            } else if (e instanceof Error) {
                ns.print(e.message)
            }
        }


        await ns.sleep(5000)
    }

}

async function printDashboard(ns: NS): Promise<void> {
    ns.clearLog();
    
    type NodeRow = {
        "Node": string
         "Produced": string, 
         "Uptime": string, 
         "Production": string, 
         "Lv": number, 
         "RAM": string, 
         "Cores": number,
         "UpLevel": string,
         "UpRAM": string,
         "UpCores": string,
    }

    const asMoney = (val: number): string => {
        return ns.formatNumber(val)
    }

    const nodes: NodeRow[]  = []
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const nodeState = ns.hacknet.getNodeStats(i)

        const nodeInfo: NodeRow = {
            Node: nodeState.name,
            Produced: asMoney(nodeState.totalProduction),
            Uptime: ns.tFormat(nodeState.timeOnline*1000),
            Production: `${asMoney(nodeState.production)} / s`,
            Lv: nodeState.level,
            RAM: ns.formatRam(nodeState.ram),
            Cores: nodeState.cores,
            UpLevel: asMoney(ns.hacknet.getRamUpgradeCost(i, upgradeLevels)),
            UpRAM: asMoney(ns.hacknet.getRamUpgradeCost(i, upgradeRam)),
            UpCores: asMoney(ns.hacknet.getCoreUpgradeCost(i, upgradeCores))
        } 
        nodes.push(nodeInfo)
    }
    ns.print(`Nodes: ${nodes.length} of ${targetNodes}`);
    ns.print(`Total Production: ${nodes.length === 0 ? "$0 /s" : ns.formatNumber(nodes.map((v, i) => ns.hacknet.getNodeStats(i).production).reduce((a, b) => a + b))} /s`)
    ns.print(`Total Produced: ${nodes.length === 0 ? "$0" : ns.formatNumber(nodes.map((v, i) => ns.hacknet.getNodeStats(i).totalProduction).reduce((a, b) => a + b))}`)
    ns.print(`Purchase cost: ${ns.formatNumber(ns.hacknet.getPurchaseNodeCost())}`)
    
    tabulate(ns, nodes, undefined, false)
}