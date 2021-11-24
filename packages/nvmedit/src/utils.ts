import { NVMFile } from "./files/NVMFile";
import { type NVMObject, ObjectType, FragmentType } from "./object";
import { type NVMPage, PageStatus } from "./page";

/** Counts the number of unset bits in the given word */
export function computeBergerCode(word: number, numBits: number = 32): number {
	let ret = word;

	// Mask the number of bits we're interested in
	if (numBits < 32) {
		ret &= (1 << numBits) - 1;
	}

	// And count the bits, see http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
	ret = ret - ((ret >> 1) & 0x55555555);
	ret = (ret & 0x33333333) + ((ret >> 2) & 0x33333333);
	ret = (((ret + (ret >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;

	return numBits - ret;
}

export function validateBergerCode(
	word: number,
	code: number,
	numBits: number = 32,
): void {
	if (computeBergerCode(word, numBits) !== code) {
		throw new Error("Berger Code validation failed!");
	}
}

export function validateBergerCodeMulti(
	words: number[],
	numBits: number,
): void {
	let actual = 0;
	let expected: number;
	for (const word of words) {
		actual += computeBergerCode(word, Math.min(numBits, 32));
		if (numBits < 32) {
			const maskSize = 32 - numBits;
			const mask = (1 << maskSize) - 1;
			expected = (word >>> numBits) & mask;
			break;
		}
		numBits -= 32;
	}
	if (actual !== expected!) {
		throw new Error("Berger Code validation failed!");
	}
}

export function mapToObject<T, TMap extends Map<string | number, T>>(
	map: TMap,
): Record<string, T> {
	const obj: Record<string | number, T> = {};
	for (const [key, value] of map) {
		obj[key] = value;
	}
	return obj;
}

export function dumpPage(page: NVMPage, json: boolean = false): void {
	console.log(` `);
	console.log(`read page (offset 0x${page.header.offset.toString(16)}):`);
	console.log(`  version: ${page.header.version}`);
	console.log(`  eraseCount: ${page.header.eraseCount}`);
	console.log(`  status: ${PageStatus[page.header.status]}`);
	console.log(`  encrypted: ${page.header.encrypted}`);
	console.log(`  pageSize: ${page.header.pageSize}`);
	console.log(`  writeSize: ${page.header.writeSize}`);
	console.log(`  memoryMapped: ${page.header.memoryMapped}`);
	console.log(`  deviceFamily: ${page.header.deviceFamily}`);
	console.log("");
	console.log(`  objects:`);
	for (const obj of page.objects) {
		dumpObject(obj, json);
	}
}

export function dumpObject(obj: NVMObject, json: boolean = false): void {
	try {
		if (json) {
			const file = NVMFile.from(obj);
			console.log(`  · ${JSON.stringify(file.toJSON(), null, 2)}`);
			return;
		}
	} catch {
		// ignore
	}
	console.log(`  · key: 0x${obj.key.toString(16)}`);
	console.log(`    type: ${ObjectType[obj.type]}`);
	console.log(`    fragment type: ${FragmentType[obj.fragmentType]}`);
	if (obj.data)
		console.log(
			`    data: ${obj.data.toString("hex")} (${obj.data.length} bytes)`,
		);
}
