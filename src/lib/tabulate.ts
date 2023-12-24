import { NS } from '@ns'

export async function ttabulate( ns: NS, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    objects: Record<string, any>[], 
    keys = Object.keys(objects[0]||{})): Promise<void> {
        return tabulate(ns, objects, keys, true)
}

export async function tabulate( ns: NS, 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                objects: Record<string, any>[], 
                                keys = Object.keys(objects[0]||{}),
                                terminal = false): Promise<void> {
	const columns: {[id: string] : number} = {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const toStr = (val: any): string => {
		if (val === undefined) {
			return "-"
		}
		if (typeof val === 'string') {
			return val as string
		} else if (typeof val === 'number') {
			const numVal = Number(val).toLocaleString('en-us', {maximumFractionDigits: 2})
			return numVal
		} else {
			return JSON.stringify(val)
		}
	}
	// Compute the required width of all columns
	for (const key of keys) {
		const lengths = objects.map(v => toStr(v[key]).length);
		columns[key] = Math.max(key.length, ...lengths) + 1;
	}

	let table = "\n";

	// Add header row and a vertical bar
	let header="|", vbar="+";
	for (const key in columns){
		header += key.padStart(columns[key]) + "|";
		vbar += "-".repeat(columns[key]) + "+";
	}
	table += header + "\n" + vbar + "\n";

	for (const obj of objects) {
		let row = "|";
		for (const key in columns)
			row += toStr(obj[key]).padStart(columns[key]) + "|";
		table += row + "\n";
	}

    if (terminal) {
        ns.tprint(table);
    } else {
        ns.print(table);
    }
}

