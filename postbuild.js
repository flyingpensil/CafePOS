import fs from 'fs';
import path from 'path';

const distHtml = path.resolve('dist/index.html');
if (fs.existsSync(distHtml)) {
  const content = fs.readFileSync(distHtml, 'utf-8');
  
  // Copy to root index.html and 404.html for GitHub Pages branch deployment
  fs.writeFileSync(path.resolve('index.html'), content);
  fs.writeFileSync(path.resolve('404.html'), content);
  fs.writeFileSync(path.resolve('dist/404.html'), content);

  // Copy to POS, Backend, and Bsckend sub-routes
  for (const dir of ['POS', 'Backend', 'Bsckend']) {
    const targetDir = path.resolve(dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), content);

    const distTargetDir = path.resolve('dist', dir);
    if (!fs.existsSync(distTargetDir)) fs.mkdirSync(distTargetDir, { recursive: true });
    fs.writeFileSync(path.join(distTargetDir, 'index.html'), content);
  }

  // Copy dist/assets to root assets
  const distAssets = path.resolve('dist/assets');
  const rootAssets = path.resolve('assets');
  if (!fs.existsSync(rootAssets)) fs.mkdirSync(rootAssets, { recursive: true });
  for (const file of fs.readdirSync(distAssets)) {
    fs.copyFileSync(path.join(distAssets, file), path.join(rootAssets, file));
  }

  console.log('✓ Postbuild sync completed: All routes (POS, Backend, 404, assets) updated.');
}
