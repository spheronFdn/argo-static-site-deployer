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
    tx.addTag("Content-Type", "text/html");
    await client.transactions.sign(tx, jwk);

    txs.push(tx);
    files[i].id = tx.id;
  }
};

(async () => {
  await getHtmlFiles("./out");
  const jwk = JSON.parse((await fs.readFileSync("arweave.json")).toString());
  await createTxs(jwk);

  let data = {
    manifest: "arweave/paths",
    version: "0.1.0",
    index: {},
    paths: {},
    items: txs,
  };
  const index = files.find((file) => file.slug === "/");
  if (index) {
    data.index = { path: "/" };
  }
  for (const file of files) {
    data.paths = {
      ...data.paths,
      [file.slug]: {
        id: file.id,
      },
    };
  }

  const tx = await client.createTransaction(
    {
      data: JSON.stringify(data),
    },
    jwk
  );
  tx.addTag("Bundle-Format", "json");
  tx.addTag("Bundle-Version", "1.0.0");
  tx.addTag("Content-Type", "application/x.arweave-manifest+json");

  await client.transactions.sign(tx, jwk);
  await client.transactions.post(tx);

  console.log(tx.id);
})();
