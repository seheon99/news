import ipaddr from "ipaddr.js";

export function isPublic(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.parse(address);
  if (
    parsed instanceof ipaddr.IPv6 &&
    parsed.match(ipaddr.IPv6.parse("::"), 96)
  )
    return false;
  return ipaddr.process(address).range() === "unicast";
}
