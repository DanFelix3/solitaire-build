// Loading screen
window.addEventListener('load',()=>{
    setTimeout(()=>{
        const screen=document.getElementById('loading-screen');
        screen.classList.add('hidden');
        setTimeout(()=>screen.style.display='none',1000);
    },1200);
});

// ===================== CONSTANTS =====================
const SUITS=['heart','diamond','spade','clover'];
const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS=['heart','diamond'];

function isRed(suit){return RED_SUITS.includes(suit);}
function rankValue(rank){return RANKS.indexOf(rank);}
function suitImg(suit){return `assets/svg/${suit}.svg`;}

// ===================== GAME STATE =====================
let stock=[];
let waste=[];
let foundations={heart:[],diamond:[],spade:[],clover:[]};
let tableau=[[],[],[],[],[],[],[]];
let dragInfo=null;
let selectedInfo=null;

// ===================== SCORE & TIMER =====================
let score=0;
let timerSeconds=0;
let timerInterval=null;

function addScore(pts){
    score=Math.max(0,score+pts);
    document.getElementById('score-display').textContent=score;
}

function startTimer(){
    clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
        timerSeconds++;
        // Standard scoring: -2 every 10 seconds after 30s
        if(timerSeconds>30&&timerSeconds%10===0)addScore(-2);
        updateTimerDisplay();
    },1000);
}

function stopTimer(){
    clearInterval(timerInterval);
}

function updateTimerDisplay(){
    const m=Math.floor(timerSeconds/60);
    const s=String(timerSeconds%60).padStart(2,'0');
    document.getElementById('timer-display').textContent=`${m}:${s}`;
}

// ===================== DECK =====================
function createDeck(){
    const deck=[];
    for(const suit of SUITS){
        for(const rank of RANKS){
            deck.push({suit,rank,faceUp:false});
        }
    }
    return deck;
}

function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
}

// ===================== INIT =====================
function initGame(){
    stopTimer();
    const deck=shuffle(createDeck());
    tableau=[[],[],[],[],[],[],[]];
    waste=[];
    foundations={heart:[],diamond:[],spade:[],clover:[]};
    dragInfo=null;
    selectedInfo=null;
    score=0;
    timerSeconds=0;
    document.getElementById('score-display').textContent='0';
    updateTimerDisplay();

    // Deal tableau
    let idx=0;
    for(let col=0;col<7;col++){
        for(let row=0;row<=col;row++){
            const card={...deck[idx++],faceUp:row===col};
            tableau[col].push(card);
        }
    }
    // Rest goes to stock face-down
    stock=deck.slice(idx).map(c=>({...c,faceUp:false}));

    render();
    startTimer();
}

// ===================== CARD ELEMENT =====================
function createCardEl(card){
    const el=document.createElement('div');
    el.classList.add('card');
    if(card.faceUp){
        el.classList.add(isRed(card.suit)?'red-card':'black-card');
        el.innerHTML=`
            <div class="card-top">
                <div class="card-items">
                    <p>${card.rank}</p>
                    <img src="${suitImg(card.suit)}" alt="${card.suit}">
                </div>
            </div>
            <div class="card-center">
                <div class="card-items">
                    <img src="${suitImg(card.suit)}" alt="${card.suit}">
                </div>
            </div>
            <div class="card-bottom">
                <div class="card-items">
                    <p>${card.rank}</p>
                    <img src="${suitImg(card.suit)}" alt="${card.suit}">
                </div>
            </div>
        `;
    }else{
        el.classList.add('face-down');
    }
    return el;
}

// ===================== RENDER =====================
function render(){
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    checkWin();
}

function renderStock(){
    const el=document.getElementById('stock');
    el.innerHTML='';
    if(stock.length>0){
        const back=createCardEl({faceUp:false});
        back.style.position='relative';
        back.style.cursor='pointer';
        el.appendChild(back);
    }else{
        const label=document.createElement('span');
        label.classList.add('empty-label');
        label.textContent='\u21BA';
        el.appendChild(label);
    }
}

function renderWaste(){
    const wasteEl=document.getElementById('waste');
    wasteEl.innerHTML='';
    if(waste.length===0)return;

    // Show up to last 3 cards fanned left-to-right
    const visible=waste.slice(-3);
    // Fan offset in px — fixed so it never exceeds the wrapper width
    const fanPx=18;

    visible.forEach((card,i)=>{
        const el=createCardEl(card);
        el.classList.add('waste-card');
        el.style.left=(i*fanPx)+'px';
        el.style.zIndex=10+i;

        const isTop=i===visible.length-1;
        if(isTop){
            el.draggable=true;
            el.addEventListener('dragstart',(e)=>onDragStart(e,{source:'waste',card}));
            // Click top card: select OR deselect
            el.addEventListener('click',()=>onWasteTopClick(el,card));
        }else{
            el.style.pointerEvents='none';
        }
        wasteEl.appendChild(el);
    });
}

function renderFoundations(){
    SUITS.forEach(suit=>{
        const slot=document.querySelector(`.foundation-slot[data-suit="${suit}"]`);
        slot.innerHTML='';
        const pile=foundations[suit];
        if(pile.length===0){
            const img=document.createElement('img');
            img.src=suitImg(suit);
            img.alt=suit;
            img.classList.add('suit-placeholder');
            slot.appendChild(img);
        }else{
            const card=pile[pile.length-1];
            const el=createCardEl(card);
            el.style.position='relative';
            slot.appendChild(el);
        }
    });
}

function renderTableau(){
    // Card offset values (px) — face-down cards show less
    const DOWN_OFFSET=20;
    const UP_OFFSET=28;

    document.querySelectorAll('.tableau-col').forEach((colEl,colIdx)=>{
        colEl.innerHTML='';
        const pile=tableau[colIdx];

        // Calculate total height for the column so it doesn't clip
        let totalH=0;
        pile.forEach((c,k)=>{
            if(k<pile.length-1)totalH+=c.faceUp?UP_OFFSET:DOWN_OFFSET;
        });
        const cardH=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'))||90;
        colEl.style.minHeight=(totalH+cardH+8)+'px';

        pile.forEach((card,cardIdx)=>{
            const el=createCardEl(card);

            // Stack offset
            let top=0;
            for(let k=0;k<cardIdx;k++){
                top+=pile[k].faceUp?UP_OFFSET:DOWN_OFFSET;
            }
            el.style.top=top+'px';
            el.style.zIndex=cardIdx+1;

            if(card.faceUp){
                el.draggable=true;
                el.addEventListener('dragstart',(e)=>{
                    onDragStart(e,{source:'tableau',colIdx,cardIdx,card});
                });
                el.addEventListener('click',(e)=>{
                    e.stopPropagation();
                    onTableauCardClick(colIdx,cardIdx);
                });
            }else{
                // Flip face-down if it's the last card
                if(cardIdx===pile.length-1){
                    el.style.cursor='pointer';
                    el.addEventListener('click',()=>{
                        card.faceUp=true;
                        addScore(5); // +5 for flipping
                        render();
                    });
                }
            }

            colEl.appendChild(el);
        });

        // Drag events on column
        colEl.addEventListener('dragover',(e)=>{
            e.preventDefault();
            colEl.classList.add('drag-over');
        });
        colEl.addEventListener('dragleave',()=>colEl.classList.remove('drag-over'));
        colEl.addEventListener('drop',()=>{
            colEl.classList.remove('drag-over');
            if(!dragInfo)return;
            if(doMove(dragInfo,{dest:'tableau',colIdx})){
                dragInfo=null;
                render();
            }else{
                dragInfo=null;
            }
        });

        // Click empty column to place selected card (King rule)
        colEl.addEventListener('click',()=>{
            if(pile.length>0||!selectedInfo)return;
            if(tryMoveSelected({dest:'tableau',colIdx}))clearSelection();
        });
    });
}

// ===================== STOCK CLICK =====================
document.getElementById('stock').addEventListener('click',()=>{
    clearSelection();
    if(stock.length===0){
        // Recycle waste back to stock, penalty
        if(waste.length===0)return;
        stock=waste.slice().reverse().map(c=>({...c,faceUp:false}));
        waste=[];
        addScore(-100);
    }else{
        const card=stock.pop();
        card.faceUp=true;
        waste.push(card);
        addScore(-2); // small draw penalty
    }
    render();
});

// ===================== POWER-UP: undo draw =====================
// Sends top waste card back into the top of the stock
document.getElementById('powerup-btn').addEventListener('click',()=>{
    if(waste.length===0)return;
    const card=waste.pop();
    card.faceUp=false;
    stock.push(card); // goes to TOP of stock (next draw)
    clearSelection();
    render();
});

// ===================== FOUNDATION DROPS =====================
document.querySelectorAll('.foundation-slot').forEach(slot=>{
    slot.addEventListener('dragover',(e)=>{
        e.preventDefault();
        slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
    slot.addEventListener('drop',()=>{
        slot.classList.remove('drag-over');
        if(!dragInfo)return;
        const suit=slot.dataset.suit;
        if(doMove(dragInfo,{dest:'foundation',suit})){
            dragInfo=null;
            render();
        }else{
            dragInfo=null;
        }
    });
    slot.addEventListener('click',()=>{
        if(!selectedInfo)return;
        if(tryMoveSelected({dest:'foundation',suit:slot.dataset.suit}))clearSelection();
    });
});

// ===================== DRAG START =====================
function onDragStart(e,info){
    clearSelection();
    dragInfo=info;
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain','card');

    // Dim dragged stack visually
    setTimeout(()=>{
        if(info.source==='tableau'){
            const cols=document.querySelectorAll('.tableau-col');
            const cards=cols[info.colIdx].querySelectorAll('.card');
            for(let k=info.cardIdx;k<cards.length;k++){
                cards[k].classList.add('drag-source');
            }
        }
    },0);
}

document.addEventListener('dragend',()=>{
    document.querySelectorAll('.drag-source').forEach(el=>el.classList.remove('drag-source'));
    document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
});

// ===================== MOVE ENGINE =====================
// All moves go through doMove — returns true if successful
function doMove(info,dest){
    if(dest.dest==='foundation'){
        // Only single top card moves to foundation
        let card=null;
        let remove=null;

        if(info.source==='waste'&&waste.length>0){
            card=waste[waste.length-1];
            remove=()=>waste.pop();
        }else if(info.source==='tableau'){
            const pile=tableau[info.colIdx];
            if(info.cardIdx!==pile.length-1)return false;
            card=pile[pile.length-1];
            remove=()=>{pile.pop();autoFlip(info.colIdx);};
        }

        if(!card)return false;
        if(!canFoundation(card,dest.suit))return false;

        remove();
        foundations[dest.suit].push(card);
        addScore(10); // +10 to foundation
        return true;
    }

    if(dest.dest==='tableau'){
        const target=tableau[dest.colIdx];

        if(info.source==='waste'&&waste.length>0){
            const card=waste[waste.length-1];
            if(!canTableau(card,target))return false;
            waste.pop();
            target.push(card);
            addScore(5); // +5 waste to tableau
            return true;
        }

        if(info.source==='tableau'){
            if(info.colIdx===dest.colIdx)return false;
            const src=tableau[info.colIdx];
            const stack=src.slice(info.cardIdx);
            if(!canTableau(stack[0],target))return false;
            tableau[info.colIdx]=src.slice(0,info.cardIdx);
            stack.forEach(c=>target.push(c));
            autoFlip(info.colIdx);
            addScore(3); // +3 tableau to tableau
            return true;
        }

        if(info.source==='foundation'){
            const fpile=foundations[info.suit];
            if(fpile.length===0)return false;
            const card=fpile[fpile.length-1];
            if(!canTableau(card,target))return false;
            fpile.pop();
            target.push(card);
            addScore(-15); // penalty for moving off foundation
            return true;
        }
    }
    return false;
}

// ===================== RULES =====================
function canFoundation(card,suit){
    if(card.suit!==suit)return false;
    const pile=foundations[suit];
    if(pile.length===0)return card.rank==='A';
    return rankValue(card.rank)===rankValue(pile[pile.length-1].rank)+1;
}

function canTableau(card,pile){
    if(pile.length===0)return card.rank==='K';
    const top=pile[pile.length-1];
    if(!top.faceUp)return false;
    return isRed(card.suit)!==isRed(top.suit)&&rankValue(card.rank)===rankValue(top.rank)-1;
}

function autoFlip(colIdx){
    const pile=tableau[colIdx];
    if(pile.length>0&&!pile[pile.length-1].faceUp){
        pile[pile.length-1].faceUp=true;
        addScore(5);
    }
}

// ===================== CLICK SELECT / MOVE =====================
function onWasteTopClick(el,card){
    if(selectedInfo&&selectedInfo.source==='waste'){
        clearSelection();
        return;
    }
    clearSelection();
    selectedInfo={source:'waste',card};
    el.classList.add('highlighted');
}

function onTableauCardClick(colIdx,cardIdx){
    // If something is already selected, try to move it here
    if(selectedInfo){
        const moved=tryMoveSelected({dest:'tableau',colIdx,targetCardIdx:cardIdx});
        if(moved){clearSelection();return;}
        // If move failed, switch selection to this card
        clearSelection();
    }
    selectedInfo={source:'tableau',colIdx,cardIdx};
    highlightStack(colIdx,cardIdx);
}

function highlightStack(colIdx,cardIdx){
    const cols=document.querySelectorAll('.tableau-col');
    const cards=cols[colIdx].querySelectorAll('.card');
    // cards[k] corresponds to tableau[colIdx][k]
    for(let k=cardIdx;k<cards.length;k++){
        cards[k].classList.add('highlighted');
    }
}

function clearHighlights(){
    document.querySelectorAll('.highlighted').forEach(el=>el.classList.remove('highlighted'));
}

function clearSelection(){
    selectedInfo=null;
    clearHighlights();
}

function tryMoveSelected(dest){
    if(!selectedInfo)return false;
    return doMove(selectedInfo,dest);
}

// ===================== WIN =====================
function checkWin(){
    const total=Object.values(foundations).reduce((s,p)=>s+p.length,0);
    if(total!==52)return;
    stopTimer();
    // Time bonus: max 700 pts diminishing over 30 minutes
    const bonus=Math.max(0,700-Math.floor(timerSeconds/2));
    addScore(bonus);
    document.getElementById('win-score-text').textContent=`Score: ${score}`;
    const m=Math.floor(timerSeconds/60);
    const s=String(timerSeconds%60).padStart(2,'0');
    document.getElementById('win-time-text').textContent=`Time: ${m}:${s}`;
    document.getElementById('win-screen').classList.remove('hidden');
}

// ===================== HAMBURGER MENU =====================
const hamMenu=document.querySelector('.ham-menu');
const offScreenMenu=document.querySelector('.off-screen-menu');

hamMenu.addEventListener('click',()=>{
    hamMenu.classList.toggle('active');
    offScreenMenu.classList.toggle('active');
});

document.addEventListener('click',(e)=>{
    if(!offScreenMenu.contains(e.target)&&!hamMenu.contains(e.target)){
        hamMenu.classList.remove('active');
        offScreenMenu.classList.remove('active');
    }
});

document.getElementById('menu-how').addEventListener('click',()=>{
    document.getElementById('how-to-modal').classList.remove('hidden');
    hamMenu.classList.remove('active');
    offScreenMenu.classList.remove('active');
});

document.getElementById('menu-reset').addEventListener('click',()=>{
    hamMenu.classList.remove('active');
    offScreenMenu.classList.remove('active');
    initGame();
});

document.getElementById('menu-quit').addEventListener('click',()=>{
    hamMenu.classList.remove('active');
    offScreenMenu.classList.remove('active');
    if(confirm('Quit game? Progress will be lost.'))initGame();
});

document.getElementById('close-modal').addEventListener('click',()=>{
    document.getElementById('how-to-modal').classList.add('hidden');
});

document.getElementById('win-reset').addEventListener('click',()=>{
    document.getElementById('win-screen').classList.add('hidden');
    initGame();
});

// ===================== START =====================
initGame();
