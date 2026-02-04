/**
 * MK Step Parser 最终版
 * 灵感：中文课表情递进（😂→😒→😝）
 * 核心体验：✅ 在线一行引入（零下载） ✅ 无感知离线兼容（断网可用）
 * 标准语法：<html data-mk="远程地址"> + <mk img src="A=>B=>C">
 * 无网络依赖：脚本加载后断网/本地运行，均正常解析
 * 开源协议：MIT | 兼容所有浏览器/本地项目/断网场景
 */
(function (window, document) {
    'use strict';
    // 防止重复加载/解析
    if (window.MKStepParserInited) return;
    window.MKStepParserInited = true;

    // 全局默认配置（可通过window.MKStepConfig覆盖）
    const DEFAULT_CONFIG = {
        splitChar: '=>',
        arrowText: '→',
        containerClass: 'mk-step-container',
        imgClass: 'mk-step-img',
        arrowClass: 'mk-step-arrow',
        imgWidth: '100px',
        imgHeight: '100px',
        gap: '12px',
        arrowColor: '#2563eb'
    };
    const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.MKStepConfig || {});

    // 1. 注入内置样式（无网络依赖，离线也生效）
    function injectStyle() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = `
            .${CONFIG.containerClass}{display:flex;align-items:center;gap:${CONFIG.gap};flex-wrap:wrap;margin:1rem 0;box-sizing:border-box;width:100%}
            .${CONFIG.imgClass}{width:${CONFIG.imgWidth};height:${CONFIG.imgHeight};object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;box-sizing:border-box;transition:all .2s ease}
            .${CONFIG.imgClass}:hover{border-color:${CONFIG.arrowColor};transform:scale(1.02)}
            .${CONFIG.arrowClass}{font-size:18px;color:${CONFIG.arrowColor};font-weight:600;line-height:1;user-select:none;margin:0 2px}
            @media (max-width:480px){.${CONFIG.containerClass}{gap:8px}.${CONFIG.imgClass}{width:70px;height:70px}.${CONFIG.arrowClass}{font-size:16px}}
            @media (min-width:481px) and (max-width:768px){.${CONFIG.imgClass}{width:85px;height:85px}}
        `;
        document.head.appendChild(style);
    }

    // 2. 解析单个mk标签（兼容本地/远程/相对/绝对路径，离线无影响）
    function parseSingleMkTag(tag) {
        const src = tag.getAttribute('src') || '';
        if (!src) { tag.remove(); return; }
        // 路径清洗：去空格、过滤空值，离线本地路径完美解析
        const imgPaths = src.split(CONFIG.splitChar)
            .map(p => p.trim())
            .filter(p => !!p);
        if (imgPaths.length === 0) { tag.remove(); return; }

        const container = document.createElement('div');
        container.className = CONFIG.containerClass;
        imgPaths.forEach((path, idx) => {
            const img = document.createElement('img');
            img.src = path; // 支持：远程URL/本地相对/本地绝对/内网路径
            img.alt = `步骤${idx + 1}`;
            img.className = CONFIG.imgClass;
            // 图片兜底（离线图片丢失也有占位，无网络依赖）
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VmZWUyZTIiLz48cGF0aCBkPSJNMzIgMzJ2MzZoMzZ2LTYgMjAgMjAgMCAwLTIwLTIwem0wIDQyYzE4LjggMCAzNC0xNS4yIDM0LTM0cy0xNS4yLTM0LTM0LTM0LTM0IDE1LjIgLTM0IDM0IDE1LjIgMzQgMzQgMzR6IiBmaWxsPSIjZmY2NjY2Ii8+PC9zdmc+';
                img.alt = `步骤${idx + 1}（图片加载失败）`;
            };
            container.appendChild(img);
            // 最后一个元素不加箭头，还原表情递进逻辑
            if (idx < imgPaths.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = CONFIG.arrowClass;
                arrow.textContent = CONFIG.arrowText;
                container.appendChild(arrow);
            }
        });
        tag.replaceWith(container);
    }

    // 3. 解析所有mk标签
    function parseAllMkTags() {
        document.querySelectorAll('mk[img][src]').forEach(parseSingleMkTag);
    }

    // 4. 自动加载远程脚本（仅在线模式，开发者零下载）
    function autoLoadRemoteScript() {
        const htmlTag = document.querySelector('html');
        const remoteUrl = htmlTag?.getAttribute('data-mk');
        if (remoteUrl && !document.querySelector(`script[src="${remoteUrl}"]`)) {
            const script = document.createElement('script');
            script.src = remoteUrl;
            script.crossOrigin = 'anonymous'; // 跨域缓存，提升离线概率
            script.onload = parseAllMkTags;
            // 远程加载失败：降级为本地解析，不影响核心功能
            script.onerror = () => {
                console.warn('MK Step Parser：远程脚本加载失败，已降级为本地解析模式');
                parseAllMkTags();
            };
            document.head.appendChild(script);
            htmlTag.removeAttribute('data-mk'); // 避免重复加载
        }
    }

    // 5. 初始化：无感知离线兼容核心
    function init() {
        injectStyle(); // 先注入样式，无网络依赖
        // DOM加载完成后解析，优先本地解析（断网也能跑）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                parseAllMkTags(); // 本地优先解析
                autoLoadRemoteScript(); // 再加载远程（在线模式）
            });
        } else {
            parseAllMkTags();
            autoLoadRemoteScript();
        }
    }

    // 暴露全局方法，支持动态生成标签解析
    window.parseMKStepTags = parseAllMkTags;
    window.MKStepDefaultConfig = DEFAULT_CONFIG;

    // 启动初始化
    init();

})(window, document);
