import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import fs from "fs";
import { JWKInterface } from "arweave/node/lib/wallet";
import cliProgress from "cli-progress";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const files: { slug: string; id: string; data: string }[] = [];
const txs: Transaction[] = [];

const getFiles = async (dir: string, subdir?: string) => {
  const _ = fs.readdirSync(subdir || dir);
  for (const file of _) {
    const path = (subdir || dir) + "/" + file;
    if (fs.statSync(path).isDirectory()) {
      getFiles(dir, path);
    } else {
      let slug = path.split(dir)[1].split(".html")[0];
      if (slug.startsWith("/")) slug = slug.substr(1);

      files.push({
        slug,
        id: "",
        data: (await fs.readFileSync(path)).toString(),
      });
    }
  }
};

const createTxs = async (jwk: JWKInterface) => {
  const prog = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  prog.start(files.length - 1, 0);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const tx = await client.createTransaction(
      {
        data: file.data,
      },
      jwk
    );

    if (file.slug.split(".").length === 1)
      tx.addTag("Content-Type", "text/html");

    if (file.slug.endsWith(".css")) tx.addTag("Content-Type", "text/css");
    if (file.slug.endsWith(".png")) tx.addTag("Content-Type", "image/png");

    await client.transactions.sign(tx, jwk);
    await client.transactions.post(tx);

    files[i].id = tx.id;

    prog.update(i);
  }

  prog.stop();
};

(async () => {
  await getFiles("./out");
  const jwk = JSON.parse((await fs.readFileSync("arweave.json")).toString());
  await createTxs(jwk);

  let data = {
    manifest: "arweave/paths",
    version: "0.1.0",
    index: {},
    paths: {},
  };
  const index = files.find((file) => file.slug === "index");
  if (index) {
    data.index = { path: "index" };
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
  tx.addTag("Content-Type", "application/x.arweave-manifest+json");

  await client.transactions.sign(tx, jwk);
  await client.transactions.post(tx);

  console.log(tx.id);
})();
