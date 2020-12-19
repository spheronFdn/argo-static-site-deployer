import Arweave from "arweave";
import Transactions from "arweave/node/transactions";
import fs from "fs";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const files: { slug: string; id: string; data: string }[] = [];
const txs: Transactions[] = [];

const getHtmlFiles = async (dir: string, subdir?: string) => {
  const _ = fs.readdirSync(subdir || dir);
  for (const file of _) {
    const path = (subdir || dir) + "/" + file;
    if (fs.statSync(path).isDirectory()) {
      getHtmlFiles(dir, path);
    } else {
      if (file.endsWith(".html")) {
        let slug = "";
        if (file === "index.html") slug = (subdir || dir) + "/";
        else slug = (subdir || dir) + "/" + file.split(".html")[0];
        slug = slug.split(dir)[1];
        if (slug.startsWith("/")) slug = slug.slice(1, slug.length);
        
        files.push({
          slug,
          id: "",
          data: (await fs.readFileSync(path)).toString(),
        });
      }
    }
  }
};

(async () => {
  await getHtmlFiles("./out");
  console.log(files);
})();
