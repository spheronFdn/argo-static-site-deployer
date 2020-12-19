import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const files: { slug: string; id: string; data: string }[] = [];
const txs: Transaction[] = [];

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

const injectAssets = async () => {
  // TODO
};

const createTxs = async (jwk: JWKInterface) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const tx = await client.createTransaction(
      {
        data: file.data,
      },
      jwk
    );
    await client.transactions.sign(tx, jwk);

    txs.push(tx);
    files[i].id = tx.id;
  }
};

(async () => {
  await getHtmlFiles("./out");
  const jwk = JSON.parse((await fs.readFileSync("arweave.json")).toString());
  await createTxs(jwk);

  for (const file of files) {
    console.log(file.slug, file.id);
  }
})();
