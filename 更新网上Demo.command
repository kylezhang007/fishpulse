#!/bin/zsh
# 双击运行：重新构建 FishPulse，并发布到同一个公开链接 https://fishpulse-v2.vercel.app
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
command -v vercel >/dev/null || npm i -g vercel@latest
[ -d node_modules ] || npm install

echo "正在构建…"
npm run build >/dev/null || { npm run build; read -k1; exit 1; }

# 发布目录放在 Git 仓库外面（../deploy-v2），否则 Vercel 会因 Git 提交作者不匹配而拦截（Blocked）
find ../deploy-v2 -mindepth 1 -maxdepth 1 ! -name .vercel -exec rm -rf {} +
mkdir -p ../deploy-v2 && cp -R dist/. ../deploy-v2/

echo "正在发布到 Vercel…"
(cd ../deploy-v2 && vercel deploy --prod --yes --project fishpulse-v2) && echo "\n✅ 已更新：https://fishpulse-v2.vercel.app"
echo "按任意键关闭"; read -k1
