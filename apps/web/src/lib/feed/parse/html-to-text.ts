import { Parser as HtmlParser } from "htmlparser2";

export function htmlToText(value: string | undefined): string {
  let output = "";
  let hidden = 0;
  const parser = new HtmlParser(
    {
      onopentag(name) {
        if (name === "script" || name === "style") hidden++;
        else if (!hidden) output += " ";
      },
      ontext(part) {
        if (!hidden) output += part;
      },
      onclosetag(name) {
        if (name === "script" || name === "style") hidden--;
        else if (!hidden) output += " ";
      },
    },
    { decodeEntities: true },
  );
  parser.end(value ?? "");
  return output.replace(/\s+/g, " ").trim();
}
