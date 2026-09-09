// Minimal YAML front-matter field editor for Jig's own task files.
// Operates only inside the leading `---` ... `---` block.

function frontMatterBlock(md) {
  const m = String(md).match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

// Reads one field from the front-matter block, with any trailing `# comment`
// stripped. Returns undefined when the field — or the block — is absent.
export function getFrontMatterField(md, key) {
  const block = frontMatterBlock(md);
  if (block === null) return undefined;
  const m = block.match(new RegExp(`^${key}:[ \\t]*([^\\n]*)$`, 'm'));
  if (!m) return undefined;
  return m[1].replace(/\s+#.*$/, '').trim();
}

export function setFrontMatterField(md, key, value) {
  const block = frontMatterBlock(md);
  if (block === null) throw new Error('no front-matter block found');
  const re = new RegExp(`^(${key}:)[^\\n]*$`, 'm');
  const line = `${key}: ${value}`;
  const newBlock = re.test(block)
    ? block.replace(re, () => line)
    : `${block}\n${line}`;
  return md.replace(block, newBlock);
}
