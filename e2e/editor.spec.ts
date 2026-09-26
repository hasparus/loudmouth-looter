import { expect, test } from "@playwright/test";

const EDITOR = { name: "Editor" } as const;

async function pasteData(
  editor: import("@playwright/test").Locator,
  formats: Record<string, string>,
) {
  await editor.evaluate((element, payload) => {
    const data = new DataTransfer();
    for (const [format, value] of Object.entries(payload))
      data.setData(format, value);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, formats);
}

async function clearEditor(page: import("@playwright/test").Page) {
  const editor = page.getByRole("textbox", EDITOR);
  await editor.click();
  await editor.evaluate((el) => {
    el.innerHTML = "<p><br></p>";
    const range = document.createRange();
    range.selectNodeContents(el.firstChild as Node);
    range.collapse(true);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  return editor;
}

test.describe("editor", () => {
  test("loads and hydrates the writing surface", async ({ page }) => {
    await page.goto("/editor/");
    await expect(page).toHaveTitle(
      "The Plan of the Parliament of Erl — loudmouth looter",
    );
    await expect(page.getByRole("textbox", EDITOR)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editor guide" }),
    ).toBeVisible();
  });

  test("slash menu opens as a listbox and matches commands", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.pressSequentially("/sq");

    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option", { name: /squares/i })).toBeVisible();
  });

  test("inserts a squares track with the requested count", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("/squares 4");
    await page.keyboard.press("Enter");

    await expect(editor.getByRole("checkbox", { name: "square" })).toHaveCount(
      4,
    );
  });

  test("converts `- [ ] ` shorthand into a task with a toggle", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("- [ ] ", { delay: 40 });
    const toggle = editor.getByRole("checkbox").first();
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    await editor.pressSequentially("write the tests", { delay: 20 });
    await expect(editor.getByText("write the tests")).toBeVisible();

    await toggle.click();
    await expect(toggle).toBeChecked();
  });

  test("slash menu navigates with arrows, commits a block on Enter", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("/");
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option", { selected: true })).toHaveCount(1);

    const before = await editor.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    await expect(editor).not.toHaveAttribute(
      "aria-activedescendant",
      before ?? "",
    );

    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();

    await editor.pressSequentially("arrow");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(menu).not.toBeVisible();
    await expect(editor.locator("p.te-arrow")).toHaveCount(1);
  });

  test("help modal opens, then closes via Escape and the close button", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const guide = page.getByRole("button", { name: "Editor guide" });

    await guide.click();
    const dialog = page.getByRole("dialog", { name: "Editor guide" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Editor guide" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    await guide.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("updates document title from the first h1", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("# My Custom Title");
    await page.keyboard.press("Enter");

    await expect(page).toHaveTitle("My Custom Title — loudmouth looter");
  });

  test("spellcheck toggle flips its label", async ({ page }) => {
    await page.goto("/editor/");
    const turnOff = page.getByRole("button", { name: "Turn spellcheck off" });
    await expect(turnOff).toBeVisible();

    await turnOff.click();
    await expect(
      page.getByRole("button", { name: "Turn spellcheck on" }),
    ).toBeVisible();
  });

  test("pastes every block of multi-block content", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
    await editor.evaluate((el, blocks) => {
      const data = new DataTransfer();
      data.setData("text/html", blocks.map((w) => `<p>${w}</p>`).join(""));
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, words);

    for (const word of words) {
      await expect(editor).toContainText(word);
    }
  });

  test("detects and formats Markdown from thin clipboard wrappers", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    const markdown =
      "## Pasted notes\n\nA **bold** intro.\n\n- first\n- second";

    await editor.evaluate((el, source) => {
      const data = new DataTransfer();
      data.setData("text/plain", source);
      data.setData(
        "text/html",
        "<div>## Pasted notes\n\nA **bold** intro.\n\n- first\n- second</div>",
      );
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, markdown);

    await expect(
      editor.getByRole("heading", { name: "Pasted notes" }),
    ).toBeVisible();
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("ul > li")).toHaveCount(2);
  });

  test("honors an explicit text/markdown clipboard payload", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "fallback text");
      data.setData("text/markdown", "# Explicit Markdown");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(
      editor.getByRole("heading", { name: "Explicit Markdown" }),
    ).toBeVisible();
    await expect(editor).not.toContainText("fallback text");
  });

  test("pastes inline Markdown at the caret without splitting the paragraph", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>beforeafter</p>";
      const text = element.firstChild!.firstChild!;
      const range = document.createRange();
      range.setStart(text, 6);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });

    await pasteData(editor, { "text/plain": "**bold**" });
    await expect(editor.locator("p")).toHaveCount(1);
    await expect(editor.locator("p")).toHaveText("beforeboldafter");
    await expect(editor.locator("strong")).toHaveText("bold");
    await page.reload();
    await expect(editor.locator("strong")).toHaveText("bold");
  });

  test("leaves mixed unsupported Markdown intact", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    const source = "## Good\n\n### Important\n\n| A | B |\n| - | - |";

    await pasteData(editor, { "text/plain": source });
    await expect(editor).toContainText("### Important");
    await expect(editor).toContainText("| A | B |");
    await expect(editor.getByRole("heading", { name: "Good" })).toHaveCount(0);
  });

  test("rejects lossy explicit Markdown and keeps the plain-text fallback", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/markdown": "# Heading\n\n| A | B |\n| - | - |",
      "text/plain": "Intact fallback",
    });

    await expect(editor).toContainText("Intact fallback");
    await expect(editor.getByRole("heading", { name: "Heading" })).toHaveCount(
      0,
    );
  });

  test("prefers semantic HTML over competing explicit Markdown", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/markdown": "# Incomplete",
      "text/plain": "Complete rich copy",
      "text/html": "<p><strong>Complete rich copy</strong></p>",
    });

    await expect(editor.locator("strong")).toHaveText("Complete rich copy");
    await expect(
      editor.getByRole("heading", { name: "Incomplete" }),
    ).toHaveCount(0);
  });

  test("does not interfere with a later caret move after Markdown paste", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>first</p><p>second</p>";
      const [first, second] = element.querySelectorAll("p");
      const range = document.createRange();
      range.setStart(first!.firstChild!, 2);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      const data = new DataTransfer();
      data.setData("text/plain", "**BOLD**");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
      range.setStart(second!.firstChild!, 3);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });

    await expect(editor.locator("strong")).toHaveText("BOLD");
    await expect
      .poll(() =>
        editor.evaluate(
          () => getSelection()?.anchorNode?.parentElement?.textContent,
        ),
      )
      .toBe("second");
  });

  test("replaces a root-level block selection at its original position", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>first</p><p>second</p><p>third</p>";
      const range = document.createRange();
      range.setStart(element, 0);
      range.setEnd(element, 1);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await pasteData(editor, { "text/plain": "# Replacement" });

    await expect(
      editor.getByRole("heading", { name: "Replacement" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        editor.evaluate((element) =>
          [...element.children].map((child) => child.textContent),
        ),
      )
      .toEqual(["Replacement", "second", "third"]);
  });

  test("pastes at each newly selected caret", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>abcdef</p>";
      for (const [offset, word] of [
        [1, "ONE"],
        [4, "TWO"],
      ] as const) {
        const text =
          word === "ONE"
            ? element.firstChild!.firstChild!
            : element.firstChild!.lastChild!;
        const range = document.createRange();
        range.setStart(text, offset);
        range.collapse(true);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
        const data = new DataTransfer();
        data.setData("text/plain", `**${word}**`);
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    });

    await expect(editor.locator("p")).toHaveText("aONEbcdeTWOf");
    await expect(editor.locator("strong")).toHaveText(["ONE", "TWO"]);
  });

  test("pastes into text split by a preceding Markdown block", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>abcdef</p>";
      const first = document.createRange();
      first.setStart(element.firstChild!.firstChild!, 1);
      first.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(first);
      const heading = new DataTransfer();
      heading.setData("text/plain", "# HEAD");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: heading,
          bubbles: true,
          cancelable: true,
        }),
      );

      const second = document.createRange();
      second.setStart(element.querySelectorAll("p")[1]!.firstChild!, 4);
      second.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(second);
      const emphasis = new DataTransfer();
      emphasis.setData("text/plain", "**TWO**");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: emphasis,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(editor.getByRole("heading", { name: "HEAD" })).toBeVisible();
    await expect(editor.locator("strong")).toHaveText("TWO");
    await expect(editor.locator("p").last()).toHaveText("bcdeTWOf");
  });

  test("keeps both rapid clipboard pastes in order", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      for (const word of ["ONE", "TWO"]) {
        const data = new DataTransfer();
        data.setData("text/plain", `**${word}**`);
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    });

    await expect(editor.locator("strong")).toHaveCount(2);
    await expect(editor.locator("strong")).toHaveText(["ONE", "TWO"]);
  });

  test("does not trim a Markdown-only clipboard payload", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, { "text/markdown": "  **bold**\n\n" });

    await expect(editor.locator("strong")).toHaveCount(0);
    await expect(editor).toContainText("**bold**");
    await expect
      .poll(() => editor.evaluate((element) => element.innerHTML))
      .toContain("  **bold**<br><br>");
  });

  test("preserves trailing blank lines when Markdown looks inline", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, { "text/plain": "**bold**\n\n" });

    await expect(editor).toContainText("**bold**");
    await expect(editor.locator("strong")).toHaveCount(0);
    await expect(
      editor.locator("p").filter({ hasText: "**bold**" }).locator("br"),
    ).toHaveCount(3);
  });

  test("an aborted image read does not remove later text", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>abc</p>";
      const NativeReader = window.FileReader;
      window.FileReader = class extends NativeReader {
        override readAsDataURL(_blob: Blob) {
          queueMicrotask(() => this.dispatchEvent(new ProgressEvent("abort")));
        }
      };
      const image = new DataTransfer();
      image.items.add(
        new File([new Uint8Array([1])], "1.png", { type: "image/png" }),
      );
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: image,
          bubbles: true,
          cancelable: true,
        }),
      );
      const text = new DataTransfer();
      text.setData("text/plain", "**BOLD**");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: text,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(editor.locator("strong")).toHaveText("BOLD");
    await expect(editor.locator("img")).toHaveCount(0);
  });

  test("does not move a changed selection after asynchronous image paste", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>first</p><p>second</p>";
      const [first, second] = element.querySelectorAll("p");
      const range = document.createRange();
      range.setStart(first!.firstChild!, 2);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      const data = new DataTransfer();
      data.items.add(
        new File([new Uint8Array([1])], "1.png", { type: "image/png" }),
      );
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
      range.setStart(second!.firstChild!, 3);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });

    await expect(editor.locator("img")).toHaveCount(1);
    await expect
      .poll(() =>
        editor.evaluate(
          () => getSelection()?.anchorNode?.parentElement?.textContent,
        ),
      )
      .toBe("second");
  });

  test("keeps image order when reads finish out of order", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      const NativeReader = window.FileReader;
      let reads = 0;
      window.FileReader = class extends NativeReader {
        override readAsDataURL(blob: Blob) {
          const delay = ++reads === 1 ? 40 : 0;
          setTimeout(() => super.readAsDataURL(blob), delay);
        }
      };
      for (const byte of [1, 2]) {
        const data = new DataTransfer();
        data.items.add(
          new File([new Uint8Array([byte])], `${byte}.png`, {
            type: "image/png",
          }),
        );
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    });

    await expect(editor.locator("img")).toHaveCount(2);
    await expect(editor.locator("img").first()).toHaveAttribute(
      "src",
      "data:image/png;base64,AQ==",
    );
    await expect(editor.locator("img").last()).toHaveAttribute(
      "src",
      "data:image/png;base64,Ag==",
    );
  });

  test("replacing the document after paste does not reapply stale content", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      const data = new DataTransfer();
      data.setData("text/plain", "**bold**");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
      element.innerHTML = "<p>replacement</p>";
    });

    await expect(editor).toHaveText("replacement");
    await expect(editor.locator("strong")).toHaveCount(0);
  });

  test("retains rich HTML's interior blank block", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/plain": "**bold**\n\nTRAIL",
      "text/html": "<p>**bold**</p><p><br></p><p>TRAIL</p>",
    });

    await expect(editor.locator("strong")).toHaveCount(0);
    await expect(
      editor.locator('p:has-text("**bold**") + p:has(> br)'),
    ).toHaveCount(1);
  });

  test("retains rich HTML's trailing blank block", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/plain": "**bold**\n",
      "text/html": "<p>**bold**</p><p><br></p>",
    });

    await expect(editor).toContainText("**bold**");
    await expect(editor.locator("strong")).toHaveCount(0);
    await expect(
      editor.locator('p:has-text("**bold**") + p:has(> br)'),
    ).toHaveCount(1);
  });

  test("preserves semantic rich HTML that resembles Markdown", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "**literal markers**");
      data.setData("text/html", "<p><i>**literal markers**</i></p>");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(editor.locator("i")).toHaveText("**literal markers**");
    await expect(editor.locator("strong")).toHaveCount(0);
  });
});
