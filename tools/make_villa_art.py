"""
Makes the extra pixel art of Villa De Girafjes from the game's own map art (Monster Tamer, MIT).
Run from the repo root:  python3 tools/make_villa_art.py
Writes PNG files to assets/images/villa/.
"""
from collections import deque
import os
from PIL import Image

MAP = 'assets/images/monster-tamer/map/'
OUT = 'assets/images/villa/'
os.makedirs(OUT, exist_ok=True)


def is_grass(p):
    r, g, b, a = p
    return a == 0 or (g > r + 10 and g > b + 10)


def map_crop(box):
    bg = Image.open(MAP + 'main_1_level_background.png').convert('RGBA')
    fg = Image.open(MAP + 'main_1_level_foreground.png').convert('RGBA')
    c = bg.crop(box)
    c.alpha_composite(fg.crop(box))
    return c


def cut_out(img, seed):
    """keeps the non-grass area connected to seed, makes the rest transparent"""
    W, H = img.size
    px = img.load()
    keep = set([seed])
    q = deque([seed])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in keep and not is_grass(px[n]):
                keep.add(n)
                q.append(n)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    op = out.load()
    for p in keep:
        op[p] = px[p]
    return out.crop(out.getbbox())


# ---------- small pixel helpers ----------
PAL = {
    'k': (45, 45, 45), 'w': (255, 255, 255), 'l': (200, 216, 232), 's': (144, 160, 176), 'S': (88, 88, 112),
    'r': (216, 72, 64), 'R': (140, 40, 48), 'p': (248, 152, 136), 'o': (232, 144, 56), 'y': (248, 216, 96),
    'Y': (200, 152, 40), 'b': (96, 160, 216), 'B': (48, 96, 160), 'c': (152, 208, 248), 'g': (120, 184, 88),
    'G': (56, 120, 72), 'n': (152, 104, 64), 'N': (96, 64, 40), 't': (232, 192, 128), 'm': (112, 64, 40),
    'v': (152, 104, 200), 'e': (192, 168, 136),
}
GRASS = (175, 208, 124)
SCALE = 4


def grid_image(rows, pal=PAL, width=None):
    w = width or max(len(r) for r in rows)
    for i, r in enumerate(rows):
        assert len(r) <= w, f'row {i} too long: {r!r} ({len(r)})'
    img = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    px = img.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                px[x, y] = pal[ch] + (255,)
    return img


def up(img, s=SCALE):
    return img.resize((img.width * s, img.height * s), Image.NEAREST)


def rect(px, x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[x, y] = col + (255,) if len(col) == 3 else col


def outline(img, col=PAL['k']):
    """adds a 1 pixel dark outline around everything that is not transparent"""
    src = img.copy()
    sp = src.load()
    px = img.load()
    W, H = img.size
    for y in range(H):
        for x in range(W):
            if sp[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and sp[nx, ny][3] > 0:
                        px[x, y] = col + (255,)
                        break
    return img


# ---------- 1. the secret house: a village house with a red roof and a lock ----------
def make_secret_house():
    x0, y0 = 13 * 64, 70 * 64 + 40
    house = cut_out(map_crop((x0, y0, 19 * 64, 75 * 64)), (190, 130))
    px = house.load()
    roof = {
        (48, 96, 160): (128, 36, 44), (96, 160, 216): (200, 64, 56), (96, 152, 232): (200, 64, 56),
        (152, 208, 248): (240, 128, 96), (152, 200, 240): (232, 116, 88), (217, 238, 255): (255, 208, 176),
    }
    walls = {(200, 216, 232): (244, 228, 180), (144, 160, 176): (212, 184, 128)}
    W, H = house.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if y < 118 and (r, g, b) in roof:
                px[x, y] = roof[(r, g, b)] + (255,)
            elif (r, g, b) in walls:
                px[x, y] = walls[(r, g, b)] + (255,)
    # a golden padlock on the door (door is the third tile column)
    lock = grid_image([
        '..kkkk..',
        '.kk..kk.',
        '.k....k.',
        'kkkkkkkk',
        'kyyyyyYk',
        'kyyNNyYk',
        'kyyNNyYk',
        'kyyyyyYk',
        'kkkkkkkk',
    ])
    house.alpha_composite(up(lock), (152, 128))
    # a little star above the door
    star = grid_image(['..k..', '.kyk.', 'kyyyk', '.kyk.', '..k..'])
    house.alpha_composite(up(star), (158, 84))
    house.save(OUT + 'secret-house.png')


# ---------- 2. item icons, 16x16 pixel art shown at 64x64 (frame = item id - 1) ----------
ICONS = {
    1: [  # drankje
        '................', '......kkkk......', '......knnk......', '......kkkk......', '......kcck......',
        '......kcck......', '....kkcwcckk....', '...kcwcccccck...', '..kcwccccccccck.', '..krrrrrrrrrrk..',
        '..krwrrrrrrrrk..', '..krrrrrrrrrrk..', '..kRrrrrrrrrRk..', '...kRRRRRRRRk...', '....kkkkkkkk....', '................'],
    3: [  # vlindernet
        '................', '.........kkkkk..', '........knnnnnk.', '.......knwlwlwnk', '.......knlwlwlnk',
        '.......knwlwlwnk', '.......knlwlwlnk', '........knnnnnk.', '.......kNkkkkk..', '......kNk.......',
        '.....kNk........', '....kNk.........', '...kNk..........', '..kNk...........', '..kk............', '................'],
    5: [  # croissant
        '................', '................', '................', '................', '.....kkkkkk.....',
        '...kkttnnttkk...', '..kttnttttnttk..', '.ktntttttttntok.', '.kontkkkkkktnok.', 'kotnk......knook',
        'kook........kook', 'kok..........kok', '.k............k.', '................', '................', '................'],
    6: [  # pain au chocolat
        '................', '................', '................', '................', '................',
        '..kkkkkkkkkkkk..', '.kyttttttttttok.', '.kttmmttttmmtok.', '.kttmmttttmmtok.', '.kttmmttttmmtok.', '.kotttttttttook.',
        '.koooooooooooNk.', '..kkkkkkkkkkkk..', '................', '................', '................'],
    7: [  # verrekijker
        '................', '................', '................', '..kkkk....kkkk..', '.kSssSk..kSssSk.',
        '.kSSSSkkkkSSSSk.', '.kSSSSkSSkSSSSk.', '.kSssSkkkkSssSk.', '.kSSSSk..kSSSSk.', '.kSSSSk..kSSSSk.',
        '.kkkkkk..kkkkkk.', '.kccbbk..kccbbk.', '.kcwcbk..kcwcbk.', '.kccbbk..kccbbk.', '..kkkk....kkkk..', '................'],
    8: [  # spiekbriefje
        '................', '...kkkkkkkkkk...', '...kwwwwwwwwk...', '...kwBBBBwwwk...', '...kwwwwwwwwk...',
        '...kwBBBBBBwk...', '...kwwwwwwwwk...', '...kwBBBBBwwk...', '...kwwwwwwwwk...', '...kwrrwBBBwk...',
        '...kwwwwwwwwk...', '...kwBBBBBBwk...', '...kwwwwwwwwk...', '...kkkkkkkkkk...', '................', '................'],
    9: [  # koptelefoon
        '................', '................', '.....kkkkkk.....', '...kkbbbbbbkk...', '..kbbkkkkkkbbk..',
        '.kbk........kbk.', '.kbk........kbk.', '.kbk........kbk.', 'kkbkk......kkbkk', 'kBBBk......kBBBk',
        'kBcBk......kBcBk', 'kBBBk......kBBBk', 'kBBBk......kBBBk', '.kkk........kkk.', '................', '................'],
    10: [  # toverkrijtje
        '................', '...y............', '..yyy.....kkk...', '...y.....kwwwk..', '........kwwwlk..',
        '.......kwwwlk...', '......kwwwlk....', '.....kwwwlk.....', '....kwwwlk......', '...kpppsk.......',
        '..kpppsk.....y..', '..kppsk.....yyy.', '..kkkk.......y..', '................', '................', '................'],
    11: [  # fluitje
        '................', '................', '................', '................', '................',
        '..kkk...........', '.k...k.kkkkkkk..', '.k...kkoooooook.', '.k...koywoooook.', '..kkkkooooooook.',
        '.....kooooooook.', '.....kRooooooRk.', '......kkkkkkkk..', '................', '................', '................'],
    12: [  # kompas
        '.......kk.......', '.....kkkkkk.....', '...kkYYYYYYkk...', '..kYYwwwwwwYYk..', '.kYwwwwrwwwwwYk.',
        '.kYwwwwrrwwwwYk.', 'kYwwwwwrrwwwwwYk', 'kYwwwwrrrrwwwwYk', 'kYwwwwSSSSwwwwYk', 'kYwwwwwSSwwwwwYk',
        '.kYwwwwSSwwwwYk.', '.kYwwwwwSwwwwYk.', '..kYYwwwwwwYYk..', '...kkYYYYYYkk...', '.....kkkkkk.....', '................'],
    13: [  # sleutel tot de school
        '................', '................', '................', '................', '..kkkk..........',
        '.kyyYYk.........', 'kyykkYYk........', 'kyk..kYkkkkkkkk.', 'kyk..kyyyyyyyyyk', 'kyykkYYkkkkYkYk.',
        '.kYYYYk...kYkYk.', '..kkkk.....k.k..', '................', '................', '................', '................'],
}


def make_item_icons():
    sheet = Image.new('RGBA', (64 * 13, 64), (0, 0, 0, 0))
    for item_id in range(1, 14):
        if item_id == 2:
            ball = Image.open('assets/images/monster-tamer/battle/cosmoball.png').convert('RGBA')
            icon = ball.resize((64, 64), Image.NEAREST)
        elif item_id == 4:
            gold = dict(PAL, n=PAL['y'], N=PAL['Y'], w=(255, 244, 200), l=PAL['y'])
            icon = up(grid_image(ICONS[3], gold, 16))
        else:
            icon = up(grid_image(ICONS[item_id], PAL, 16))
        sheet.alpha_composite(icon, ((item_id - 1) * 64, 0))
    sheet.save(OUT + 'items.png')


# ---------- 3. kermis: background, stalls and mini-game sprites ----------
from PIL import ImageDraw


def map_tile(tx, ty):
    return Image.open(MAP + 'main_1_level_background.png').convert('RGBA').crop((tx * 64, ty * 64, tx * 64 + 64, ty * 64 + 64))


def tree_band():
    """a row of village trees, with the grass above them made transparent"""
    band = map_crop((11 * 64, 68 * 64, 19 * 64, 70 * 64))
    px = band.load()
    W, H = band.size
    for x in range(W):
        for y in range(H):
            r, g, b, a = px[x, y]
            if r + g + b < 260:  # reached the dark outline of a tree
                break
            px[x, y] = (0, 0, 0, 0)
    return band


def cloud(d, x, y, w):
    d.rectangle((x + 2, y, x + w - 3, y + 1), fill=(255, 255, 255))
    d.rectangle((x, y + 2, x + w, y + 4), fill=(255, 255, 255))
    d.rectangle((x + 1, y + 5, x + w - 1, y + 5), fill=(216, 232, 244))


def make_kermis_background():
    lo = Image.new('RGBA', (256, 144), (176, 224, 250, 255))
    d = ImageDraw.Draw(lo)
    for y0, y1, col in ((0, 9, (120, 192, 240)), (10, 19, (136, 204, 244)), (20, 29, (152, 214, 248)), (30, 39, (164, 220, 250))):
        d.rectangle((0, y0, 255, y1), fill=col)
    cloud(d, 96, 8, 18)
    cloud(d, 150, 18, 12)
    cloud(d, 196, 6, 20)
    # ferris wheel on the left
    cx, cy, rad = 36, 32, 25
    for leg in ((cx - 16, 70), (cx + 16, 70)):
        d.line((cx, cy, leg[0], leg[1]), fill=PAL['k'], width=3)
        d.line((cx, cy, leg[0], leg[1]), fill=PAL['l'], width=1)
    import math
    for i in range(8):
        a = i * math.pi / 4
        d.line((cx, cy, cx + rad * math.cos(a), cy + rad * math.sin(a)), fill=PAL['s'], width=1)
    d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=PAL['k'], width=3)
    d.ellipse((cx - rad + 1, cy - rad + 1, cx + rad - 1, cy + rad - 1), outline=PAL['r'], width=1)
    d.rectangle((cx - 2, cy - 2, cx + 2, cy + 2), fill=PAL['k'])
    for i, col in enumerate(['y', 'b', 'g', 'p', 'y', 'b', 'g', 'p']):
        a = i * math.pi / 4 + math.pi / 8
        gx, gy = cx + rad * math.cos(a), cy + rad * math.sin(a)
        d.rectangle((gx - 3, gy, gx + 3, gy + 5), fill=PAL['k'])
        d.rectangle((gx - 2, gy + 1, gx + 2, gy + 4), fill=PAL[col])
    # big circus tent on the right
    tx = 214
    for i in range(-30, 31):
        top = 14 + abs(i) * 0.9
        col = PAL['r'] if (i + 30) // 6 % 2 == 0 else PAL['w']
        d.line((tx + i, top, tx + i, 60), fill=col)
    d.line((tx - 30, 41, tx, 14), fill=PAL['k'])
    d.line((tx + 30, 41, tx, 14), fill=PAL['k'])
    d.line((tx, 14, tx, 8), fill=PAL['k'])
    d.polygon(((tx, 8), (tx + 6, 10), (tx, 12)), fill=PAL['y'], outline=PAL['k'])
    img = up(lo)
    # grass from the village map
    tiles = [map_tile(11, 60), map_tile(28, 60), map_tile(9, 61), map_tile(28, 60)]
    for ty in range(160, 576, 64):
        for tx2 in range(0, 1024, 64):
            img.alpha_composite(tiles[(tx2 // 64 * 7 + ty // 64 * 3) % 4], (tx2, ty))
    band = tree_band()
    img.alpha_composite(band, (0, 100))
    img.alpha_composite(band, (512, 100))
    # bunting over everything
    over = Image.new('RGBA', (256, 144), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    colors = ['r', 'y', 'b', 'g', 'w']
    for rope_y, sag in ((3, 6),):
        pts = [(x, rope_y + sag * (1 - ((x - 128) / 128) ** 2)) for x in range(0, 256)]
        for x, y in pts:
            over.putpixel((x, int(y)), PAL['k'] + (255,))
        for n, x in enumerate(range(3, 256, 10)):
            y = int(pts[x][1]) + 1
            col = PAL[colors[n % len(colors)]]
            od.polygon(((x - 3, y), (x + 3, y), (x, y + 6)), fill=col, outline=PAL['k'])
    img.alpha_composite(up(over))
    img.save(OUT + 'kermis-bg.png')


def make_stall(color, dark, decor):
    W, H = 60, 56
    lo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lo)
    # back wall and posts
    d.rectangle((5, 12, 54, 36), fill=dark)
    for x in (3, 53):
        d.rectangle((x, 10, x + 3, 50), fill=PAL['n'])
        d.line((x + 3, 10, x + 3, 50), fill=PAL['N'])
    # awning with stripes and scallops
    for x in range(1, 59):
        stripe = color if (x - 1) // 6 % 2 == 0 else PAL['w']
        top = 3 if 6 <= x <= 53 else 3 + (6 - x if x < 6 else x - 53) // 2
        d.line((x, top, x, 10), fill=stripe)
        if (x - 1) % 6 in (1, 2, 3, 4):
            d.line((x, 11, x, 12 if (x - 1) % 6 in (1, 4) else 13), fill=stripe)
    d.rectangle((24, 0, 35, 3), fill=PAL['w'])
    d.line((24, 3, 35, 3), fill=color)
    # counter and front panel
    d.rectangle((1, 36, 58, 39), fill=PAL['t'])
    d.line((1, 39, 58, 39), fill=PAL['n'])
    d.rectangle((4, 40, 55, 53), fill=color)
    d.rectangle((4, 44, 55, 46), fill=PAL['w'])
    d.line((4, 53, 55, 53), fill=dark)
    decor(d)
    return up(outline(lo))


def decor_cans(d):
    def can(x, y, col):
        d.rectangle((x, y, x + 4, y + 5), fill=col)
        d.line((x, y, x + 4, y), fill=PAL['l'])
        d.line((x, y + 3, x + 4, y + 3), fill=PAL['w'])
    for x, y, col in ((19, 30, PAL['r']), (25, 30, PAL['b']), (31, 30, PAL['g']), (37, 30, PAL['y']), (22, 24, PAL['y']), (28, 24, PAL['r']), (34, 24, PAL['b']), (25, 18, PAL['g']), (31, 18, PAL['r'])):
        can(x, y, col)
    # three balls on the counter
    for x in (8, 12, 47):
        d.rectangle((x, 33, x + 2, 35), fill=PAL['w'])
        d.point((x, 33), fill=PAL['l'])


def decor_cards(d):
    for x, y, col in ((12, 16, PAL['r']), (25, 14, PAL['w']), (38, 16, PAL['r'])):
        d.rectangle((x, y, x + 9, y + 13), fill=PAL['k'])
        d.rectangle((x + 1, y + 1, x + 8, y + 12), fill=col)
        if col == PAL['w']:
            d.rectangle((x + 3, y + 4, x + 6, y + 8), fill=PAL['b'])
        else:
            d.line((x + 2, y + 2, x + 7, y + 11), fill=PAL['p'])
            d.line((x + 7, y + 2, x + 2, y + 11), fill=PAL['p'])
    for x in range(10, 50, 9):
        d.rectangle((x, 32, x + 6, 35), fill=PAL['w'])
        d.rectangle((x, 32, x + 6, 32), fill=PAL['l'])


def decor_ducks(d):
    # water in a basin on the counter, with little ducks
    d.rectangle((6, 28, 53, 35), fill=PAL['b'])
    for x in range(8, 52, 6):
        d.line((x, 30, x + 2, 30), fill=PAL['c'])
    for x in (11, 26, 41):
        d.rectangle((x, 24, x + 6, 29), fill=PAL['y'])
        d.rectangle((x + 4, 21, x + 7, 24), fill=PAL['y'])
        d.point((x + 6, 22), fill=PAL['k'])
        d.line((x + 8, 23, x + 9, 23), fill=PAL['o'])
        d.line((x + 1, 26, x + 3, 26), fill=PAL['Y'])
    # a fishing rod on the wall
    d.line((16, 15, 44, 15), fill=PAL['n'])
    d.line((44, 15, 44, 20), fill=PAL['k'])


def make_stalls():
    stalls = [
        make_stall(PAL['r'], (150, 70, 70), decor_cans),
        make_stall(PAL['b'], (60, 100, 150), decor_cards),
        make_stall((240, 176, 48), (150, 110, 50), decor_ducks),
    ]
    sheet = Image.new('RGBA', (stalls[0].width * 3, stalls[0].height), (0, 0, 0, 0))
    for i, s in enumerate(stalls):
        sheet.alpha_composite(s, (i * s.width, 0))
    sheet.save(OUT + 'stalls.png')


def make_cans():
    cols = [PAL['r'], PAL['b'], PAL['g'], (240, 176, 48)]
    sheet = Image.new('RGBA', (26 * 4 * 4, 28 * 4), (0, 0, 0, 0))
    for i, col in enumerate(cols):
        lo = Image.new('RGBA', (26, 28), (0, 0, 0, 0))
        d = ImageDraw.Draw(lo)

        def can(x, y):
            d.rectangle((x, y, x + 9, y + 12), fill=col)
            d.rectangle((x, y, x + 9, y + 1), fill=PAL['l'])
            d.line((x, y + 1, x + 9, y + 1), fill=PAL['s'])
            d.rectangle((x, y + 5, x + 9, y + 8), fill=PAL['w'])
            d.line((x + 1, y + 2, x + 1, y + 11), fill=(255, 255, 255, 120))
            d.line((x + 9, y + 2, x + 9, y + 12), fill=tuple(int(c * 0.7) for c in col))
        can(1, 14)
        can(14, 14)
        can(7, 1)
        sheet.alpha_composite(up(outline(lo)), (i * 26 * 4, 0))
    sheet.save(OUT + 'cans.png')


def make_duck():
    rows = [
        '.............kkk......',
        '............kyyyk.....',
        '...........kyyyyyk....',
        '...........kyykyykkk..',
        '...........kyyyyykook.',
        '...........kyyyyykkk..',
        'kk..........kyyyk.....',
        'kyk......kkkkyyyk.....',
        'kyyk...kkyyyyyyyyk....',
        'kyyykkkyyyyyyyyyyyk...',
        'kyyyyyyyYYYYYyyyyyk...',
        '.kyyyyyyyYYYYyyyyyk...',
        '.kYyyyyyyyyyyyyyyYk...',
        '..kYYyyyyyyyyyyYYk....',
        '...kkYYYYYYYYYYkk.....',
        '.....kkkkkkkkkk.......',
    ]
    up(grid_image(rows)).save(OUT + 'duck.png')


def make_cards():
    W, H = 50, 28
    out = Image.new('RGBA', (W * 4 * 5, H * 4), (0, 0, 0, 0))
    fronts = [None, (220, 234, 248), (255, 243, 196), (176, 228, 160), (255, 255, 255)]
    for i, fill in enumerate(fronts):
        lo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lo)
        d.rectangle((0, 1, W - 1, H - 2), fill=PAL['k'])
        d.rectangle((1, 0, W - 2, H - 1), fill=PAL['k'])
        if fill is None:  # back of the card
            d.rectangle((1, 1, W - 2, H - 2), fill=PAL['r'])
            for x in range(-H, W, 6):
                d.line((x, 1, x + H, H - 2), fill=(232, 104, 96))
                d.line((x + H, 1, x, H - 2), fill=(232, 104, 96))
            d.rectangle((2, 2, W - 3, H - 3), outline=PAL['w'])
            d.rectangle((17, 7, 32, 20), fill=PAL['w'])
            d.rectangle((17, 7, 32, 20), outline=PAL['R'])
        else:
            d.rectangle((1, 1, W - 2, H - 2), fill=fill)
            d.rectangle((2, 2, W - 3, H - 3), outline=tuple(int(c * 0.8) for c in fill))
            d.line((2, H - 3, W - 3, H - 3), fill=tuple(int(c * 0.7) for c in fill))
        out.alpha_composite(up(lo), (i * W * 4, 0))
    out.save(OUT + 'cards.png')


def make_water():
    map_tile(34, 24).save(OUT + 'water.png')


def make_classroom():
    lo = Image.new('RGBA', (256, 144), (244, 228, 180, 255))
    d = ImageDraw.Draw(lo)
    # wall pattern, wainscot and floor
    for x in range(0, 256, 8):
        d.line((x, 0, x, 92), fill=(236, 218, 166))
    d.rectangle((0, 92, 255, 104), fill=PAL['n'])
    d.line((0, 92, 255, 92), fill=PAL['k'])
    d.line((0, 95, 255, 95), fill=PAL['t'])
    d.line((0, 104, 255, 104), fill=PAL['k'])
    for y in range(105, 144, 6):
        d.rectangle((0, y, 255, y + 5), fill=(200, 150, 96))
        d.line((0, y + 5, 255, y + 5), fill=(160, 112, 72))
        off = (y // 6) % 2 * 16
        for x in range(off, 256, 32):
            d.line((x, y, x, y + 5), fill=(160, 112, 72))
    # blackboard with a wooden frame and chalk tray
    d.rectangle((52, 6, 203, 50), fill=PAL['k'])
    d.rectangle((53, 7, 202, 49), fill=PAL['n'])
    d.rectangle((56, 10, 199, 46), fill=(48, 92, 64))
    d.line((56, 10, 199, 10), fill=(64, 112, 80))
    d.rectangle((60, 49, 195, 52), fill=PAL['N'])
    d.rectangle((70, 48, 74, 49), fill=PAL['w'])
    d.rectangle((80, 48, 83, 49), fill=PAL['y'])
    # windows left and right
    for wx in (8, 216):
        d.rectangle((wx, 14, wx + 32, 54), fill=PAL['k'])
        d.rectangle((wx + 1, 15, wx + 31, 53), fill=PAL['w'])
        d.rectangle((wx + 3, 17, wx + 29, 51), fill=PAL['c'])
        d.line((wx + 16, 17, wx + 16, 51), fill=PAL['w'])
        d.line((wx + 3, 34, wx + 29, 34), fill=PAL['w'])
        d.line((wx + 6, 20, wx + 10, 20), fill=PAL['w'])
    # a clock and a plant
    d.ellipse((120, 56, 136, 72), fill=PAL['w'], outline=PAL['k'])
    d.line((128, 64, 128, 59), fill=PAL['k'])
    d.line((128, 64, 132, 64), fill=PAL['k'])
    d.rectangle((226, 80, 238, 92), fill=PAL['o'], outline=PAL['k'])
    for dx, dy in ((-4, -8), (0, -12), (4, -8), (-2, -4), (3, -3)):
        d.ellipse((232 + dx - 4, 80 + dy - 4, 232 + dx + 4, 80 + dy + 4), fill=PAL['g'], outline=PAL['G'])
    up(lo).save(OUT + 'classroom.png')


BUILDINGS = 'assets/images/monster-tamer/map/buildings/'


def recolor(img, mapping, box):
    px = img.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y][:3]
            if c in mapping:
                m = mapping[c]
                px[x, y] = (m(x, y) if callable(m) else m) + (255,)


def make_shop_interior():
    """the shop of Madame Dupont: tiled floor, red carpet, bread on display, jars on the shelves, a blue and white awning"""
    img = Image.open(BUILDINGS + 'building_2_level_background.png').convert('RGBA')
    W, H = img.size
    tile = lambda x, y: (236, 228, 204) if ((x // 32) + (y // 32)) % 2 == 0 else (200, 216, 232)
    recolor(img, {(205, 187, 171): tile, (166, 133, 143): (150, 160, 176)}, (0, 160, W, H))
    recolor(img, {(176, 208, 126): (216, 96, 88), (102, 170, 93): (160, 56, 56)}, (0, 160, W, H))
    recolor(img, {(166, 133, 143): (120, 150, 200), (205, 187, 171): (236, 228, 204)}, (0, 0, W, 160))
    d = ImageDraw.Draw(img)
    # awning over the top of the wall
    for x in range(64, 768, 32):
        col = (48, 96, 160) if (x // 32) % 2 == 0 else (252, 252, 252)
        d.rectangle((x, 28, x + 31, 52), fill=col)
        d.rectangle((x + 4, 52, x + 27, 60), fill=col)
    d.line((64, 28, 767, 28), fill=PAL['k'], width=4)
    # bread on display instead of the TV
    d.rectangle((384, 36, 511, 128), fill=PAL['k'])
    d.rectangle((388, 40, 507, 124), fill=(152, 104, 64))
    for y in (52, 88):
        d.rectangle((392, y + 24, 503, y + 28), fill=(96, 64, 40))
    for i, x in enumerate(range(396, 500, 36)):
        d.rounded_rectangle((x, 56, x + 30, 74), radius=8, fill=(232, 176, 96), outline=PAL['k'], width=3)
        d.line((x + 8, 60, x + 12, 68), fill=(200, 136, 64), width=3)
        d.line((x + 18, 60, x + 22, 68), fill=(200, 136, 64), width=3)
        d.pieslice((x, 92, x + 30, 120), 180, 360, fill=(232, 192, 128), outline=PAL['k'], width=3)
    # jars on the shelves
    colors = [PAL['r'], PAL['y'], PAL['g'], PAL['b'], PAL['o'], PAL['p']]
    n = 0
    for sx in (320, 516):
        for sy in (68, 104, 140):
            for jx in range(sx + 8, sx + 56, 16):
                d.rectangle((jx, sy, jx + 11, sy + 14), fill=PAL['k'])
                d.rectangle((jx + 2, sy + 2, jx + 9, sy + 12), fill=colors[n % len(colors)])
                d.rectangle((jx + 2, sy + 2, jx + 9, sy + 4), fill=PAL['w'])
                n += 1
    # a cash register on the desk at the left
    d.rectangle((128, 60, 184, 100), fill=PAL['k'])
    d.rectangle((132, 64, 180, 96), fill=(200, 152, 40))
    d.rectangle((140, 70, 172, 80), fill=(152, 208, 248))
    img.save(OUT + 'shop-interior.png')


def make_papa_interior():
    """the house of papa in the town: warm wooden floor, blue rug, green wallpaper, paintings and plants"""
    img = Image.open(BUILDINGS + 'building_3_level_background.png').convert('RGBA')
    W, H = img.size
    plank = lambda x, y: (196, 140, 96) if (y // 16) % 2 == 0 else (184, 128, 88)
    recolor(img, {(205, 187, 171): plank, (166, 133, 143): (128, 84, 56)}, (0, 160, W, H))
    recolor(img, {(176, 208, 126): (120, 160, 216), (102, 170, 93): (64, 104, 168)}, (0, 160, W, H))
    stripe = lambda x, y: (176, 208, 160) if (x // 16) % 2 == 0 else (160, 196, 148)
    recolor(img, {(166, 133, 143): stripe, (205, 187, 171): (232, 220, 188)}, (0, 0, W, 160))
    d = ImageDraw.Draw(img)
    # two paintings: a giraffe and the sea
    for px0, sky, ground in ((204, (152, 208, 248), (120, 184, 88)), (700, (248, 216, 160), (96, 160, 216))):
        d.rectangle((px0, 52, px0 + 64, 104), fill=PAL['k'])
        d.rectangle((px0 + 4, 56, px0 + 60, 100), fill=(200, 152, 40))
        d.rectangle((px0 + 8, 60, px0 + 56, 96), fill=sky)
        d.rectangle((px0 + 8, 84, px0 + 56, 96), fill=ground)
    # a small giraffe in the first painting
    g = (232, 176, 72)
    d.rectangle((228, 76, 244, 84), fill=g)
    d.rectangle((240, 62, 244, 78), fill=g)
    d.rectangle((240, 60, 250, 64), fill=g)
    d.rectangle((230, 84, 232, 92), fill=g)
    d.rectangle((240, 84, 242, 92), fill=g)
    d.point((234, 79), fill=(152, 104, 64))
    d.point((238, 81), fill=(152, 104, 64))
    # a sun in the second painting
    d.ellipse((708, 62, 724, 78), fill=PAL['y'])
    img.save(OUT + 'papa-interior.png')


if __name__ == '__main__':
    make_secret_house()
    make_item_icons()
    make_kermis_background()
    make_stalls()
    make_cans()
    make_duck()
    make_cards()
    make_water()
    make_classroom()
    make_shop_interior()
    make_papa_interior()
    print('ok')
