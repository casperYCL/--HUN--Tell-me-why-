    import { registerNotoSansTC } from "./font.js"; // 正確匯入 font.js（注意：要用 export 的font.js）

    // 取得主要 DOM 元素
    let prompt = document.querySelector("#prompt");
    let submitbtn = document.querySelector("#submit");
    let chatContainer = document.querySelector(".chat-container");
    let imagebtn = document.querySelector("#image");
    let image = document.querySelector("#image img");
    let imageinput = document.querySelector("#image input");
    let questionHistory = document.getElementById("question-history");
    let newChatBtn = document.getElementById("new-chat-btn");
    const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
    const sidebar = document.querySelector(".sidebar");
    const mainLayout = document.querySelector(".main-layout");
    const saveSelect = document.getElementById("save-select");

    // API 設定 (請記得換成自己的 KEY)
    const Api_Url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=Your-Api-Key";

    // 保存所有聊天室資料
    let sessions = {}; // { id: { chats: [], name: '' } }
    let currentSessionId = null;

    // 使用者資料（訊息 + 上傳的圖片）
    let user = { message: null, file: { mime_type: null, data: null } };

    // 建立新的聊天室
    function createNewSession() {
        currentSessionId = Date.now().toString();
        sessions[currentSessionId] = { chats: [], name: '' };
        updateQuestionHistory();
        clearChatContainer();
    }

    // 更新側邊欄聊天室清單
    function updateQuestionHistory() {
        questionHistory.innerHTML = "";
        for (let id in sessions) {
            let li = document.createElement("li");
            let name = sessions[id].name || `聊天室 ${Object.keys(sessions).indexOf(id) + 1}`;
            li.innerHTML = `
                <div class="chat-title-wrapper">
                    <span class="chat-name">${name}</span>
                    <span class="edit-btn" title="編輯名稱">✏️</span>
                </div>
            `;

            li.querySelector(".chat-name").addEventListener("click", () => {
                currentSessionId = id;
                loadSessionChats();
            });

            li.querySelector(".edit-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                editChatName(li, id);
            });

            questionHistory.appendChild(li);
        }
    }

    // 編輯聊天室名稱
    function editChatName(li, id) {
        const wrapper = li.querySelector(".chat-title-wrapper");
        const span = wrapper.querySelector(".chat-name");
        const editBtn = wrapper.querySelector(".edit-btn");

        span.style.display = "none";

        const input = document.createElement("input");
        input.type = "text";
        input.value = span.textContent;
        input.className = "edit-input";

        wrapper.insertBefore(input, editBtn);
        input.focus();
        input.select();

        function saveName() {
            const newName = input.value.trim();
            sessions[id].name = newName || span.textContent;
            updateQuestionHistory();
        }

        input.addEventListener("blur", saveName);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveName();
        });
    }

    // 清空聊天內容，顯示預設歡迎訊息
    function clearChatContainer() {
        chatContainer.innerHTML = `
        <div class="ai-chat-box">
        <img src="ai.png" alt="AI" class="chat-avatar">
        <div class="ai-chat-area">Hello! How Can I Help You Today?</div>
        </div>`;
    }

    // 載入當前聊天室的聊天紀錄
    function loadSessionChats() {
        clearChatContainer();
        for (let htmlString of sessions[currentSessionId].chats) {
            const div = document.createElement("div");
            div.innerHTML = htmlString;
            chatContainer.appendChild(div.firstElementChild);
        }
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    }

    // 呼叫 API 取得 AI 回覆
    async function generateResponse(aiChatBox) {
        const text = aiChatBox.querySelector(".ai-chat-area");
        try {
            const response = await fetch(Api_Url, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: user.message }, ...(user.file.data ? [{ inline_data: user.file }] : [])] }]
                })
            });
            const data = await response.json();
            const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
            text.innerHTML = apiResponse;
            sessions[currentSessionId].chats.push(aiChatBox.outerHTML);
        } catch (error) {
            console.error(error);
        } finally {
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
            image.src = `img.svg`;
            image.classList.remove("choose");
            user.file = {};
        }
    }

    // 將 HTML 字串轉為 DOM 元素
    function createChatBox(htmlString) {
        const div = document.createElement("div");
        div.innerHTML = htmlString.trim();
        return div.firstElementChild;
    }

    // 處理使用者送出的訊息
    function handlechatResponse(userMessage) {
        if (!userMessage.trim() && !user.file.data) return;
        if (!currentSessionId) createNewSession();
    
        user.message = userMessage;
        let uploadContent = "";
    
        if (user.file.data) {
            if (user.file.mime_type.startsWith("image/")) {
                uploadContent = `<img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg" />`;
            } else {
                uploadContent = `<div class="uploaded-file">📄 上傳了檔案：${user.file.filename}</div>`;
            }
        }
    
        const userHtml = `
        <div class="user-chat-box">
          <img src="user.png" alt="User" class="chat-avatar">
          <div class="user-chat-area">
            ${uploadContent}
            ${user.message}
          </div>
        </div>`;
    
        prompt.value = "";
    
        const userChatBox = createChatBox(userHtml);
        chatContainer.appendChild(userChatBox);
        sessions[currentSessionId].chats.push(userHtml);
    
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    
        // ✅ 清空 user資料 和 input欄
        user.file = {};
        imageinput.value = "";
    
        const wrapper = document.getElementById("image");
        wrapper.innerHTML = `<img src="img2.svg" alt="plus" class="plus-icon">`;
        wrapper.parentElement.classList.remove("uploading");
    
        setTimeout(() => {
            const aiHtml = `
            <div class="ai-chat-box">
              <img src="ai.png" alt="AI" class="chat-avatar">
              <div class="ai-chat-area">
                <img src="loading.webp" alt="Loading" class="load" width="50px">
              </div>
            </div>`;
    
            const aiChatBox = createChatBox(aiHtml);
            chatContainer.appendChild(aiChatBox);
            sessions[currentSessionId].chats.push(aiHtml);
    
            generateResponse(aiChatBox);
        }, 600);
    }
    


    // ======================= 事件綁定 =========================

    prompt.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handlechatResponse(prompt.value);
    });
    submitbtn.addEventListener("click", () => handlechatResponse(prompt.value));
    imageinput.addEventListener("change", () => {
        const file = imageinput.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64string = e.target.result.split(",")[1];
            user.file = {
                mime_type: file.type,
                data: base64string,
                filename: file.name
            };
    
            const wrapper = document.getElementById("image");
            wrapper.innerHTML = "";
    
            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = `data:${user.file.mime_type};base64,${user.file.data}`;
                img.className = "choose";
                wrapper.appendChild(img);
            } else {
                const iconWrapper = document.createElement("div");
                iconWrapper.className = "file-icon-wrapper";
    
                const iconImg = document.createElement("img");
    
                if (file.type === "application/pdf") {
                    iconImg.src = "pdf.png";
                } else if (file.type.includes("spreadsheetml") || file.type.includes("excel")) {
                    iconImg.src = "excel.png";
                } else if (file.type.includes("wordprocessingml") || file.type.includes("msword")) {
                    iconImg.src = "word.png";
                } else if (file.type.includes("presentationml") || file.type.includes("powerpoint")) {
                    iconImg.src = "ppt.png";
                } else {
                    iconImg.src = "fileicon.png";
                }
    
                iconImg.alt = "file icon";
                iconWrapper.appendChild(iconImg);
                wrapper.appendChild(iconWrapper);
            }
    
            // ⭐️ 加這行：上傳成功後，讓外層黑圈也加上 active 效果
            wrapper.parentElement.classList.add("uploading");
        };
        reader.readAsDataURL(file);
    });
    
    imagebtn.addEventListener("click", () => imageinput.click());
    newChatBtn.addEventListener("click", createNewSession);
    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        mainLayout.classList.toggle("collapsed");
        toggleSidebarBtn.textContent = sidebar.classList.contains("collapsed") ? "→" : "華新麗華-AI助手";
    });
    const micButton = document.getElementById("voice");
    const micImage = micButton.querySelector("img");
    let isRecording = false;
    micButton.addEventListener("click", () => {
        isRecording = !isRecording;
        micImage.src = isRecording ? "soundmic.svg" : "mic.svg";
        micButton.classList.toggle("recording", isRecording);
    });

    document.getElementById("language-select").addEventListener("change", (e) => {
        selectedLanguage = e.target.value;
    });
    document.getElementById("model-select").addEventListener("change", (e) => {
        selectedModel = e.target.value;
    });

    // 保存聊天內容（可以正常下載 txt）
    saveSelect.addEventListener("change", () => {
        console.log("🔥 saveSelect 啟動");
    
        if (!currentSessionId || sessions[currentSessionId].chats.length === 0) {
            alert("沒有聊天內容可以保存！");
            saveSelect.value = "";
            return;
        }
    
        const now = new Date();
        const dateString = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    
        const chatContentArray = [
            `【AI】\nHello! How Can I Help You Today?`
        ].concat(
            sessions[currentSessionId].chats.map(chatHtml => {
                const div = document.createElement("div");
                div.innerHTML = chatHtml;
                const userArea = div.querySelector(".user-chat-area");
                const aiArea = div.querySelector(".ai-chat-area");
                if (userArea) {
                    let result = "【User】\n";
                    const img = userArea.querySelector("img.chooseimg");
                    const fileDiv = userArea.querySelector(".uploaded-file");
    
                    if (img) {
                        result += "上傳了圖片\n"; // 有上傳圖片
                    } else if (fileDiv) {
                        result += fileDiv.textContent.trim() + "\n"; // 有上傳文件（顯示「上傳了檔案：xxx」）
                    }
    
                    const texts = Array.from(userArea.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .filter(t => t.length > 0)
                        .join(' ');
                    if (texts.length > 0) {
                        result += texts;
                    }
                    return result;
                } else if (aiArea) {
                    const texts = Array.from(aiArea.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .filter(t => t.length > 0)
                        .join(' ');
                    return `【AI】\n${texts}`;
                }
                return "";
            }).filter(line => line.trim() !== "")
        );
    
        const chatName = sessions[currentSessionId].name || "未命名聊天室";
        const safeChatName = chatName.replace(/[\\/:*?"<>|]/g, "_");
    
        // --- 生成 TXT 檔案，加封面
        const header = `華新麗華AI聊天紀錄\n日期：${dateString}\n聊天室名稱：${chatName}\n\n-------------------------\n`;
        const textContent = header + chatContentArray.join("\n\n");
    
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = safeChatName + ".txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    
        saveSelect.value = "";
    });
    
    