import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Home, Zap, Droplet, Flame, Smartphone, ShoppingCart, Utensils, 
  PiggyBank, Briefcase, Plus, TrendingUp, TrendingDown, Wallet, 
  CreditCard, Landmark, Banknote, ListPlus, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, LogOut, Trash2, Edit3, Check, X, 
  CalendarDays, Settings, Coins, Gift, Car, Coffee, HeartPulse, Sparkles,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, BarChart2, CornerDownRight,
  Download, Upload, Telescope, Target, Rocket, SlidersHorizontal, Settings2, Users, UserPlus, Key, RefreshCw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAFf0MIQmO6Dh1mYjzRdCrthUAezlJA06g",
  authDomain: "kakeibo-app-21f44.firebaseapp.com",
  projectId: "kakeibo-app-21f44",
  storageBucket: "kakeibo-app-21f44.firebasestorage.app",
  messagingSenderId: "130029265997",
  appId: "1:130029265997:web:8ed5012edba64d00646804"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;
const googleProvider = new GoogleAuthProvider();

const ICON_MAP = {
  home: Home, zap: Zap, droplet: Droplet, flame: Flame, smartphone: Smartphone,
  shoppingCart: ShoppingCart, utensils: Utensils, piggyBank: PiggyBank,
  briefcase: Briefcase, wallet: Wallet, creditCard: CreditCard, landmark: Landmark,
  banknote: Banknote, coins: Coins, gift: Gift, car: Car, coffee: Coffee,
  heartPulse: HeartPulse, sparkles: Sparkles
};

const COLOR_PALETTE = [
  '#FF9A9E', '#FECFEF', '#FBC2EB', '#A18CD1', '#FBC2EB',
  '#84FAB0', '#8FD3F4', '#A1C4FD', '#FFECD2', '#FCB69F',
  '#FFD194', '#70E1F5', '#F6D365', '#FDA085', '#D4FC79'
];

const DEFAULT_CATEGORIES = [
  { id: 'cat_exp_rent', name: '家賃', type: 'expense', icon: 'home', color: '#A1C4FD', order: 1 },
  { id: 'cat_exp_elec', name: '電気代', type: 'expense', icon: 'zap', color: '#F6D365', order: 2 },
  { id: 'cat_exp_water', name: '水道代', type: 'expense', icon: 'droplet', color: '#8FD3F4', order: 3 },
  { id: 'cat_exp_gas', name: 'ガス代', type: 'expense', icon: 'flame', color: '#FCB69F', order: 4 },
  { id: 'cat_exp_phone', name: 'スマホ代', type: 'expense', icon: 'smartphone', color: '#A18CD1', order: 5 },
  { id: 'cat_exp_food', name: '食費', type: 'expense', icon: 'utensils', color: '#FF9A9E', order: 6 },
  { id: 'cat_exp_daily', name: '日用品', type: 'expense', icon: 'shoppingCart', color: '#84FAB0', order: 7 },
  { id: 'cat_inc_salary', name: '給料', type: 'income', icon: 'briefcase', color: '#D4FC79', order: 1 },
  { id: 'cat_inc_pocket', name: '臨時収入', type: 'income', icon: 'gift', color: '#FFD194', order: 2 },
  { id: 'cat_ast_cash', name: '現金', type: 'asset', icon: 'wallet', color: '#84FAB0', order: 1 },
  { id: 'cat_ast_bank', name: '銀行預金', type: 'asset', icon: 'landmark', color: '#A1C4FD', order: 2 },
  { id: 'cat_ast_invest', name: '投資信託', type: 'asset', icon: 'trendingUp', color: '#FBC2EB', order: 3 },
];

export const parseSafeDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '1', 10) - 1;
  const d = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return new Date(y, m, d);
};

// ローカルキャッシュヘルパー（モバイルでの即時表示＆オフライン耐性向上）
const getLocalCache = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocalCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage save error:", e);
  }
};

// 入力途中データ（下書き）のキャッシュヘルパー（iPhone/Androidの画面オフ・スリープ・再読み込み対策）
const DRAFT_KEY = 'kakeibo_input_draft';
const getInputDraft = () => {
  try {
    const local = localStorage.getItem(DRAFT_KEY);
    if (local) return JSON.parse(local);
  } catch (e) {}
  try {
    const session = sessionStorage.getItem(DRAFT_KEY);
    if (session) return JSON.parse(session);
  } catch (e) {}
  return null;
};

const setInputDraft = (val) => {
  const str = JSON.stringify(val);
  try { localStorage.setItem(DRAFT_KEY, str); } catch (e) {}
  try { sessionStorage.setItem(DRAFT_KEY, str); } catch (e) {}
};

const clearInputDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('input');
  
  // 初期値にキャッシュまたはデフォルト値を設定し、iPhone起動時の空白時間をゼロにする
  const [categories, setCategories] = useState(() => getLocalCache('kakeibo_cache_categories', DEFAULT_CATEGORIES));
  const [transactions, setTransactions] = useState(() => getLocalCache('kakeibo_cache_transactions', []));
  const [assets, setAssets] = useState(() => getLocalCache('kakeibo_cache_assets', []));
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [importModal, setImportModal] = useState({ isOpen: false, type: null });
  const txToEditRef = useRef(null);

  const [activeWorkspace, setActiveWorkspace] = useState('personal');
  const [workspaces, setWorkspaces] = useState([{ id: 'personal', name: '👤 マイ家計簿' }]);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  const getBasePath = () => {
    if (!user) return null;
    if (activeWorkspace === 'personal') {
      return `artifacts/${appId}/users/${user.uid}`;
    }
    return `artifacts/${appId}/groups/${activeWorkspace}`;
  };

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(today.getFullYear());

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      alert("ログインに失敗しました: " + error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // iPhoneの画面ロック解除・バックグラウンド復帰時に自動再同期
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        setSyncTrigger(prev => prev + 1);
      }
    };
    const handleOnline = () => {
      if (user) {
        setSyncTrigger(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  // ワークスペース変更時に該当キャッシュを即時復元
  useEffect(() => {
    if (!user) return;
    const basePath = getBasePath();
    if (!basePath) return;

    const cachedCats = getLocalCache(`kakeibo_cache_cats_${basePath}`, null);
    if (cachedCats && cachedCats.length > 0) {
      setCategories(cachedCats);
    } else if (activeWorkspace === 'personal') {
      setCategories(DEFAULT_CATEGORIES);
    }

    const cachedTx = getLocalCache(`kakeibo_cache_tx_${basePath}`, null);
    if (cachedTx) {
      setTransactions(cachedTx);
    }

    const cachedAst = getLocalCache(`kakeibo_cache_ast_${basePath}`, null);
    if (cachedAst) {
      setAssets(cachedAst);
    }
  }, [activeWorkspace, user?.uid]);

  useEffect(() => {
    if (!user) return;

    const basePath = getBasePath();
    if (!basePath) return;

    let isSubscribed = true;
    let retryTimer = null;
    let unsubs = [];

    const cleanup = () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      unsubs.forEach(u => {
        try { if (typeof u === 'function') u(); } catch (e) {}
      });
      unsubs = [];
    };

    const subscribeAll = () => {
      if (!isSubscribed) return;
      setIsSyncing(true);

      try {
        const catRef = collection(db, `${basePath}/categories`);
        const unsubCat = onSnapshot(catRef, (snapshot) => {
          if (!isSubscribed) return;
          const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (cats.length === 0 && activeWorkspace === 'personal') {
            DEFAULT_CATEGORIES.forEach(cat => {
              setDoc(doc(db, `${basePath}/categories/${cat.id}`), cat);
            });
            setCategories(DEFAULT_CATEGORIES);
            setLocalCache(`kakeibo_cache_cats_${basePath}`, DEFAULT_CATEGORIES);
            setLocalCache('kakeibo_cache_categories', DEFAULT_CATEGORIES);
          } else {
            const sortedCats = cats.sort((a, b) => a.order - b.order);
            setCategories(sortedCats);
            setLocalCache(`kakeibo_cache_cats_${basePath}`, sortedCats);
            setLocalCache('kakeibo_cache_categories', sortedCats);
          }
          setIsSyncing(false);
        }, (error) => {
          console.error("Categories snapshot error:", error);
          setIsSyncing(false);
          if (isSubscribed && !retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (isSubscribed) subscribeAll();
            }, 3000);
          }
        });
        unsubs.push(unsubCat);

        const transRef = collection(db, `${basePath}/transactions`);
        const unsubTrans = onSnapshot(transRef, (snapshot) => {
          if (!isSubscribed) return;
          const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const sortedTrans = trans.sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date));
          setTransactions(sortedTrans);
          setLocalCache(`kakeibo_cache_tx_${basePath}`, sortedTrans);
          setLocalCache('kakeibo_cache_transactions', sortedTrans);
          setIsSyncing(false);
        }, (error) => {
          console.error("Transactions snapshot error:", error);
          setIsSyncing(false);
          if (isSubscribed && !retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (isSubscribed) subscribeAll();
            }, 3000);
          }
        });
        unsubs.push(unsubTrans);

        const astRef = collection(db, `${basePath}/assets`);
        const unsubAst = onSnapshot(astRef, (snapshot) => {
          if (!isSubscribed) return;
          const asts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAssets(asts);
          setLocalCache(`kakeibo_cache_ast_${basePath}`, asts);
          setLocalCache('kakeibo_cache_assets', asts);
        }, (error) => {
          console.error("Assets snapshot error:", error);
        });
        unsubs.push(unsubAst);

        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (!isSubscribed) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.joinedGroups) {
              setWorkspaces([{ id: 'personal', name: '👤 マイ家計簿' }, ...data.joinedGroups]);
            }
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
        });
        unsubs.push(unsubProfile);

      } catch (err) {
        console.error("Subscribe error:", err);
        setIsSyncing(false);
        if (isSubscribed && !retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            if (isSubscribed) subscribeAll();
          }, 3000);
        }
      }
    };

    subscribeAll();

    return cleanup;
  }, [user, activeWorkspace, syncTrigger]);

  const showConfirm = (message, onConfirm) => {
    setConfirmModal({ isOpen: true, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount || 0);
  };

  // カレンダー生成ヘルパー
  const generateCalendar = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); 
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month - 1, i));
    }
    return days;
  };

  // カテゴリ階層管理のヘルパー（削除されていないアクティブなもの）
  const activeCategories = useMemo(() => categories.filter(c => !c.deleted), [categories]);
  const activeParentCategories = useMemo(() => activeCategories.filter(c => !c.parentId), [activeCategories]);
  const activeSubCategories = useMemo(() => activeCategories.filter(c => c.parentId), [activeCategories]);
  
  const getActiveSubCategories = (parentId) => activeSubCategories.filter(c => c.parentId === parentId);
  
  // 履歴表示用などで、削除済みも含めて親カテゴリを探す
  const getParentId = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return (cat && cat.parentId) ? cat.parentId : catId;
  };
  const getParentCategory = (catId) => {
    const pId = getParentId(catId);
    return categories.find(c => c.id === pId);
  };
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-orange-50 text-orange-400 font-bold">読み込み中...</div>;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border-4 border-orange-100">
          <PiggyBank className="w-20 h-20 text-orange-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">家計・資産管理</h1>
          <p className="text-gray-500 mb-8 text-sm">Googleアカウントでログインして記録を始めましょう。</p>
          <button 
            className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-md active:scale-95"
            onClick={handleLogin}
          >
            Googleではじめる
          </button>
        </div>
      </div>
    );
  }

  const InputScreen = () => {
    const draft = useMemo(() => getInputDraft() || {}, []);

    const [type, setType] = useState(() => draft.type || 'expense');
    const [amount, setAmount] = useState(() => draft.amount || '');
    const [date, setDate] = useState(() => draft.date || today.toISOString().split('T')[0]);
    const [selectedParentId, setSelectedParentId] = useState(() => draft.selectedParentId || '');
    const [selectedSubId, setSelectedSubId] = useState(() => draft.selectedSubId || '');
    const [memo, setMemo] = useState(() => draft.memo || '');
    const [editingId, setEditingId] = useState(() => draft.editingId || null);

    // イベントリスナー内で常に最新のフォーム値を参照するための ref
    const formStateRef = useRef({
      type,
      amount,
      date,
      selectedParentId,
      selectedSubId,
      memo,
      editingId
    });

    useEffect(() => {
      formStateRef.current = {
        type,
        amount,
        date,
        selectedParentId,
        selectedSubId,
        memo,
        editingId
      };
    }, [type, amount, date, selectedParentId, selectedSubId, memo, editingId]);

    // 即時同期保存（iPhoneの画面オフ直前に即時反映させるため）
    const saveDraftImmediate = (updates = {}) => {
      const current = { ...formStateRef.current, ...updates };
      const hasContent = current.amount || current.memo || current.selectedParentId || current.selectedSubId || current.editingId || (current.type !== 'expense');
      if (hasContent) {
        setInputDraft(current);
      }
    };

    const handleAmountChange = (e) => {
      const rawVal = e.target.value.replace(/[^0-9]/g, '');
      setAmount(rawVal);
      saveDraftImmediate({ amount: rawVal });
    };

    const handleMemoChange = (e) => {
      const val = e.target.value;
      setMemo(val);
      saveDraftImmediate({ memo: val });
    };

    const handleDateChange = (e) => {
      const val = e.target.value;
      setDate(val);
      saveDraftImmediate({ date: val });
    };

    const handleTypeChange = (newType) => {
      setType(newType);
      setSelectedParentId('');
      setSelectedSubId('');
      saveDraftImmediate({ type: newType, selectedParentId: '', selectedSubId: '' });
    };

    const handleParentSelect = (catId) => {
      setSelectedParentId(catId);
      setSelectedSubId('');
      saveDraftImmediate({ selectedParentId: catId, selectedSubId: '' });
    };

    const handleSubSelect = (subId) => {
      setSelectedSubId(subId);
      saveDraftImmediate({ selectedSubId: subId });
    };

    // iPhoneのスリープ（画面オフ）・復帰（画面オン）を検知して確実に保存＆復元
    useEffect(() => {
      const restoreDraft = () => {
        const saved = getInputDraft();
        if (saved) {
          if (saved.amount !== undefined) setAmount(saved.amount);
          if (saved.memo !== undefined) setMemo(saved.memo);
          if (saved.type !== undefined) setType(saved.type);
          if (saved.date !== undefined) setDate(saved.date);
          if (saved.selectedParentId !== undefined) setSelectedParentId(saved.selectedParentId);
          if (saved.selectedSubId !== undefined) setSelectedSubId(saved.selectedSubId);
          if (saved.editingId !== undefined) setEditingId(saved.editingId);
        }
      };

      const saveCurrent = () => {
        const current = formStateRef.current;
        const hasContent = current.amount || current.memo || current.selectedParentId || current.selectedSubId || current.editingId || (current.type !== 'expense');
        if (hasContent) {
          setInputDraft(current);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          saveCurrent();
        } else if (document.visibilityState === 'visible') {
          restoreDraft();
        }
      };

      window.addEventListener('pagehide', saveCurrent);
      window.addEventListener('beforeunload', saveCurrent);
      window.addEventListener('pageshow', restoreDraft);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('pagehide', saveCurrent);
        window.removeEventListener('beforeunload', saveCurrent);
        window.removeEventListener('pageshow', restoreDraft);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    const availableParents = activeParentCategories.filter(c => c.type === type);
    const availableSubs = selectedParentId ? getActiveSubCategories(selectedParentId) : [];

    const calDate = parseSafeDate(date);
    const calYear = calDate.getFullYear();
    const calMonth = calDate.getMonth() + 1;
    const calendarDays = generateCalendar(calYear, calMonth);

    const changeCalMonth = (offset) => {
      const d = new Date(calYear, calMonth - 1 + offset, 1);
      const newDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setDate(newDateStr);
    };

    const handleEditClick = (tx) => {
      setEditingId(tx.id);
      setType(tx.type);
      setAmount(String(tx.amount));
      setDate(tx.date);
      setMemo(tx.memo || '');
      
      const pId = getParentId(tx.categoryId);
      if (pId !== tx.categoryId) {
        // サブカテゴリが記録されていた場合
        setSelectedParentId(pId);
        setSelectedSubId(tx.categoryId);
      } else {
        // 親カテゴリのみ記録されていた場合
        setSelectedParentId(tx.categoryId);
        setSelectedSubId('');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
      if (txToEditRef.current) {
        handleEditClick(txToEditRef.current);
        txToEditRef.current = null;
      }
    }, []);

    const resetInputForm = () => {
      setAmount('');
      setMemo('');
      setSelectedParentId('');
      setSelectedSubId('');
      setDate(today.toISOString().split('T')[0]);
      setType('expense');
      setEditingId(null);
      formStateRef.current = {
        type: 'expense',
        amount: '',
        date: today.toISOString().split('T')[0],
        selectedParentId: '',
        selectedSubId: '',
        memo: '',
        editingId: null
      };
      clearInputDraft();
    };

    const handleCancelEdit = () => {
      resetInputForm();
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // サブが選ばれていればサブを、選ばれていなければ親を最終的なカテゴリIDとする
      const finalCategoryId = selectedSubId || selectedParentId;
      if (!amount || !finalCategoryId || !date) return;
      
      const txData = {
        amount: parseInt(amount, 10),
        date,
        categoryId: finalCategoryId,
        memo,
        type,
        updatedAt: new Date().toISOString()
      };

      try {
        const savedDate = date;
        if (editingId) {
          await setDoc(doc(db, `${getBasePath()}/transactions/${editingId}`), txData, { merge: true });
        } else {
          const txId = crypto.randomUUID();
          txData.createdAt = new Date().toISOString();
          await setDoc(doc(db, `${getBasePath()}/transactions/${txId}`), txData);
        }

        // 登録完了後にすべての入力内容と下書きを完全にリセット
        resetInputForm();

        // 入力完了後に下部のリスト表示部分へスクロール
        const scrollToTarget = () => {
          const dateEl = document.getElementById(`tx-list-${savedDate}`);
          if (dateEl) {
            dateEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
          }
          return false;
        };

        setTimeout(() => {
          const found = scrollToTarget();
          if (!found) {
            const sectionEl = document.getElementById('tx-records-section');
            if (sectionEl) {
              sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setTimeout(scrollToTarget, 200);
          }
        }, 100);
      } catch (err) {
        console.error("保存エラー", err);
        alert("保存に失敗しました");
      }
    };

    const handleDelete = (id) => {
      showConfirm("この記録を削除してもよろしいですか？", async () => {
        await deleteDoc(doc(db, `${getBasePath()}/transactions/${id}`));
        if (editingId === id) resetInputForm();
        closeConfirm();
      });
    };

    const selectedDayTx = transactions.filter(tx => tx.date === date);

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
        {/* 入力フォーム */}
        <div className={`bg-white rounded-3xl shadow-sm border p-5 mb-6 transition-all ${editingId ? 'border-orange-400 shadow-orange-100 ring-4 ring-orange-50' : 'border-orange-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Edit3 size={18} className={editingId ? 'text-orange-500' : 'text-orange-400'}/> 
              {editingId ? '記録の修正' : '新しく入力'}
            </h3>
            {editingId && (
              <button onClick={handleCancelEdit} className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-500 font-bold hover:bg-gray-200">
                キャンセル
              </button>
            )}
          </div>

          <div className="flex bg-orange-50 rounded-2xl p-1 mb-5">
            <button
              type="button"
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400'}`}
              onClick={() => handleTypeChange('expense')}
            >
              支出
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${type === 'income' ? 'bg-white text-teal-500 shadow-sm' : 'text-gray-400'}`}
              onClick={() => handleTypeChange('income')}
            >
              収入
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">日付</label>
              <input type="date" value={date} onChange={handleDateChange} required
                className="w-full bg-gray-50 border-none rounded-2xl p-3 text-gray-700 focus:ring-2 focus:ring-orange-200 outline-none font-bold" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">金額</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-400 font-bold">¥</span>
                <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString() : ''} onChange={handleAmountChange} required placeholder="0"
                  className="w-full bg-gray-50 border-none rounded-2xl p-3 pl-8 text-xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">カテゴリー</label>
              {availableParents.length === 0 ? (
                <div className="py-4 px-3 text-center bg-orange-50/60 rounded-2xl border border-dashed border-orange-200">
                  <p className="text-xs text-gray-500 font-bold mb-2">
                    {isSyncing ? 'カテゴリーを同期中...' : 'カテゴリーを読み込んでいます'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSyncTrigger(prev => prev + 1)}
                    className="text-xs text-orange-500 font-bold px-4 py-1.5 bg-white rounded-full border border-orange-200 shadow-sm active:scale-95 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> 再読み込み
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableParents.map(cat => {
                    const Icon = ICON_MAP[cat.icon] || Zap;
                    const isSelected = selectedParentId === cat.id;
                    return (
                      <button type="button" key={cat.id} 
                        onClick={() => handleParentSelect(cat.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${isSelected ? 'bg-orange-100 ring-2 ring-orange-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 text-white" style={{ backgroundColor: cat.color }}>
                          <Icon size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 truncate w-full text-center">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* サブカテゴリーがある場合のみ表示 */}
              {availableSubs.length > 0 && (
                <div className="mt-3 bg-orange-50/50 p-3 rounded-2xl border border-orange-100 animate-in fade-in zoom-in-95">
                  <label className="block text-[10px] font-bold text-orange-400 mb-2">サブカテゴリー (任意)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableSubs.map(sub => {
                      const isSelected = selectedSubId === sub.id;
                      return (
                        <button type="button" key={sub.id}
                          onClick={() => handleSubSelect(sub.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${isSelected ? 'bg-orange-400 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-orange-100'}`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">メモ (任意)</label>
              <input type="text" value={memo} onChange={handleMemoChange} placeholder="スーパーなど..."
                className="w-full bg-gray-50 border-none rounded-2xl p-3 text-gray-700 focus:ring-2 focus:ring-orange-200 outline-none text-sm" />
            </div>

            {editingId ? (
              <div className="flex gap-3 mt-2">
                <button type="submit" disabled={!amount || !selectedParentId}
                  className="flex-1 text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50">
                  <Check size={20}/> 修正を保存する
                </button>
                <button type="button" onClick={() => handleDelete(editingId)}
                  className="w-14 shrink-0 text-rose-500 bg-rose-50 border border-rose-200 font-bold py-4 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center hover:bg-rose-100">
                  <Trash2 size={20}/>
                </button>
              </div>
            ) : (
              <button type="submit" disabled={!amount || !selectedParentId}
                className="w-full text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 disabled:bg-orange-200">
                <Plus size={20} /> 入力する
              </button>
            )}
          </form>
        </div>

        {/* カレンダー */}
        <div className="bg-white rounded-3xl shadow-sm border border-orange-50 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeCalMonth(-1)} className="p-1 text-orange-400 bg-orange-50 rounded-lg"><ChevronLeft size={20}/></button>
            <h3 className="font-bold text-gray-700"><span>{`${calYear}年 ${calMonth}月`}</span></h3>
            <button onClick={() => changeCalMonth(1)} className="p-1 text-orange-400 bg-orange-50 rounded-lg"><ChevronRight size={20}/></button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['日', '月', '火', '水', '木', '金', '土'].map(d => (
              <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dObj, idx) => {
              if (!dObj) return <div key={`empty-${idx}`} className="h-14"></div>;
              
              const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
              const isSelected = dStr === date;
              const isToday = dStr === currentMonthStr + '-' + String(today.getDate()).padStart(2, '0');
              
              const dayTxs = transactions.filter(t => t.date === dStr);
              const dayExp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const dayInc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

              return (
                <div 
                  key={dStr} 
                  onClick={() => { 
                    if (dayTxs.length > 0) {
                      const element = document.getElementById(`tx-list-${dStr}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  }}
                  className={`h-14 border rounded-xl flex flex-col p-1 cursor-pointer transition-all ${isSelected ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-50 hover:bg-gray-50'} ${isToday && !isSelected ? 'bg-orange-50/50' : ''}`}
                >
                  <div className={`text-[10px] font-bold text-left pl-1 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>{dObj.getDate()}</div>
                  <div className="flex flex-col gap-[1px] mt-auto">
                    {dayInc > 0 && <span className="text-[8px] font-bold text-teal-500 truncate leading-tight">+{dayInc}</span>}
                    {dayExp > 0 && <span className="text-[8px] font-bold text-rose-500 truncate leading-tight">-{dayExp}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* その月のすべての記録 */}
        <h3 id="tx-records-section" className="font-bold text-gray-600 mb-3 ml-2 flex items-center gap-2 pt-2 scroll-mt-24">
          <ListPlus size={18} className="text-orange-400"/> 
          <span>{`${calYear}年 ${calMonth}月の記録`}</span>
        </h3>
        <div className="space-y-5 mb-6">
          {(() => {
            const currentMonthPrefix = `${calYear}-${String(calMonth).padStart(2, '0')}`;
            const monthTx = transactions
              .filter(tx => tx.date.startsWith(currentMonthPrefix))
              .sort((a, b) => {
                const dateComp = b.date.localeCompare(a.date); // 降順
                if (dateComp !== 0) return dateComp;
                const aTime = a.createdAt || '';
                const bTime = b.createdAt || '';
                return bTime.localeCompare(aTime); // 新しいものが上
              });

            if (monthTx.length === 0) {
              return (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">
                    {isSyncing ? 'データを同期中...' : 'この月の記録はありません'}
                  </p>
                </div>
              );
            }

            const grouped = {};
            monthTx.forEach(tx => {
              if (!grouped[tx.date]) grouped[tx.date] = [];
              grouped[tx.date].push(tx);
            });

            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
            return sortedDates.map(dStr => (
              <div key={dStr} id={`tx-list-${dStr}`} className="scroll-mt-28">
                <div className="text-xs font-bold text-gray-500 mb-2 pl-2 border-l-2 border-orange-300">
                  {parseInt(dStr.split('-')[2], 10)}日
                </div>
                <div className="space-y-2">
                  {grouped[dStr].map(tx => {
                    const cat = categories.find(c => c.id === tx.categoryId);
                    if (!cat) return null;
                    
                    const parentCat = getParentCategory(tx.categoryId);
                    const displayColor = parentCat ? parentCat.color : cat.color;
                    const displayIcon = parentCat ? parentCat.icon : cat.icon;
                    const Icon = ICON_MAP[displayIcon] || Zap;
                    
                    const isEditing = editingId === tx.id;
                    const displayName = cat.parentId ? `${parentCat.name} (${cat.name})` : cat.name;
                    
                    return (
                      <div key={tx.id} 
                        onClick={() => handleEditClick(tx)}
                        className={`bg-white p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${isEditing ? 'border-2 border-orange-300 shadow-md ring-2 ring-orange-50' : 'border border-gray-100 shadow-sm hover:border-orange-200'}`}
                      >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: displayColor }}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-gray-700 truncate text-sm">{displayName}</span>
                            <span className={`font-bold ${tx.type === 'expense' ? 'text-rose-500' : 'text-teal-500'}`}>
                              {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-400">{tx.memo || ''}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} className="text-gray-300 hover:text-red-400 p-1 bg-gray-50 rounded-md">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    );
  };

  const ReportScreen = () => {
    const [period, setPeriod] = useState('month');
    const [targetDate, setTargetDate] = useState(currentMonthStr);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [reportType, setReportType] = useState('expense');

    const filteredTx = useMemo(() => {
      return transactions.filter(tx => {
        if (period === 'month') {
          return tx.date.startsWith(targetDate);
        } else {
          return tx.date.startsWith(targetDate.substring(0, 4));
        }
      });
    }, [transactions, period, targetDate]);

    const expenses = filteredTx.filter(t => t.type === 'expense');
    const income = filteredTx.filter(t => t.type === 'income');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    const allCategoriesData = useMemo(() => {
      const parentCats = activeParentCategories.filter(c => c.type === reportType);
      const aggregated = {};
      
      // 全ての対象親カテゴリーを0円で初期化
      parentCats.forEach(cat => {
        aggregated[cat.name] = { 
          id: cat.id,
          name: cat.name, 
          value: 0, 
          color: cat.color,
          icon: cat.icon
        };
      });

      // 実際のデータを加算
      const targetTx = reportType === 'expense' ? expenses : income;
      targetTx.forEach(tx => {
        const cat = categories.find(c => c.id === tx.categoryId);
        if (!cat) return;

        const parentCat = cat.parentId ? categories.find(c => c.id === cat.parentId) : cat;
        const name = parentCat ? parentCat.name : 'その他';
        const color = parentCat ? parentCat.color : '#ccc';
        const icon = parentCat ? parentCat.icon : 'HelpCircle';
        const id = parentCat ? parentCat.id : 'others';

        if (!aggregated[name]) {
          aggregated[name] = { id, name, value: 0, color, icon };
        }
        aggregated[name].value += (Number(tx.amount) || 0);
      });

      return Object.values(aggregated).sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }, [expenses, income, categories, activeParentCategories, reportType]);

    const chartData = useMemo(() => {
      return allCategoriesData
        .filter(d => (Number(d.value) || 0) > 0)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }, [allCategoriesData]);

    const changePeriod = (offset) => {
      if (period === 'month') {
        const [y, m] = targetDate.split('-');
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1 + offset, 1);
        setTargetDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      } else {
        setTargetDate(String(parseInt(targetDate.substring(0, 4)) + offset));
      }
    };

    if (selectedCategoryId) {
      const parentCat = categories.find(c => c.id === selectedCategoryId);
      const catName = parentCat ? parentCat.name : 'その他';
      const catColor = parentCat ? parentCat.color : '#ccc';
      
      const detailTx = filteredTx.filter(tx => {
        const cat = categories.find(c => c.id === tx.categoryId);
        if (!cat) return false;
        const pId = cat.parentId ? cat.parentId : cat.id;
        return pId === selectedCategoryId;
      });

      const detailTotal = detailTx.reduce((sum, t) => sum + t.amount, 0);

      return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedCategoryId(null)} className="p-2 bg-white rounded-xl shadow-sm text-gray-500 hover:text-orange-500"><ChevronLeft size={24}/></button>
            <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">{catName}</h2>
            <div className="w-10"></div>
          </div>

          <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm mb-4 border border-orange-50">
            <button onClick={() => changePeriod(-1)} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronLeft size={20}/></button>
            <div className="flex flex-col items-center cursor-pointer hover:opacity-80" onClick={() => {
              if (period === 'month') {
                setPeriod('year');
                setTargetDate(currentYearStr);
              } else {
                setPeriod('month');
                setTargetDate(currentMonthStr);
              }
            }}>
              <span className="text-xs text-orange-400 font-bold mb-1">{period === 'month' ? '月間' : '年間'}</span>
              <h2 className="font-bold text-gray-700 text-lg leading-none">
                <span>{period === 'month' ? `${targetDate.split('-')[0]}年 ${parseInt(targetDate.split('-')[1])}月` : `${targetDate}年`}</span>
              </h2>
            </div>
            <button onClick={() => changePeriod(1)} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronRight size={20}/></button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-orange-50 p-6 mb-6 text-center">
            <p className="text-sm font-bold text-gray-400 mb-2">合計</p>
            <p className="text-4xl font-black text-gray-800" style={{ color: catColor }}>{formatCurrency(detailTotal)}</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-orange-50 p-4 min-h-[300px]">
            <h3 className="font-bold text-gray-600 mb-4 pb-2 border-b border-gray-100">履歴</h3>
            {detailTx.length > 0 ? (
              <div className="space-y-0">
                {detailTx.map(tx => {
                  const txCat = categories.find(c => c.id === tx.categoryId) || {};
                  const parentCatOfTx = txCat.parentId ? categories.find(c => c.id === txCat.parentId) : null;
                  
                  const displayColor = parentCatOfTx ? parentCatOfTx.color : (txCat.color || catColor);
                  const displayIcon = parentCatOfTx ? parentCatOfTx.icon : (txCat.icon || 'home');
                  const TxIcon = ICON_MAP[displayIcon] || Zap;
                  
                  const dateObj = parseSafeDate(tx.date);
                  const day = dateObj.getDate();
                  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
                  
                  return (
                    <div key={tx.id} 
                         onClick={() => { txToEditRef.current = tx; setActiveTab('input'); }}
                         className="flex gap-2 items-start border-b border-gray-100 border-dashed py-3 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl px-2 -mx-2">
                      <div className="w-12 pt-1 text-center shrink-0">
                        {period === 'year' && <div className="text-[10px] font-bold text-gray-400 mb-0.5">{dateObj.getMonth() + 1}月</div>}
                        <div className={`font-black text-gray-700 leading-none ${period === 'year' ? 'text-xl' : 'text-2xl'}`}>{day}</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">({dayOfWeekStr})</div>
                      </div>
                      <div className="flex-1 pl-2">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: displayColor }}>
                              <TxIcon size={12} />
                            </div>
                            <span className="font-bold text-sm text-gray-700">{txCat.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">{formatCurrency(tx.amount)}</span>
                        </div>
                        {tx.memo && <p className="text-xs text-gray-500 mt-1.5">{tx.memo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-10">
                記録がありません
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="flex bg-orange-50 rounded-2xl p-1 mb-4">
          <button className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${period === 'month' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}
            onClick={() => { setPeriod('month'); setTargetDate(currentMonthStr); }}>月間</button>
          <button className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${period === 'year' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}
            onClick={() => { setPeriod('year'); setTargetDate(currentYearStr); }}>年間</button>
        </div>

        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm mb-4 border border-orange-50">
          <button onClick={() => changePeriod(-1)} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronLeft size={20}/></button>
          <h2 className="font-bold text-gray-700 text-lg">
            <span>{period === 'month' ? `${targetDate.split('-')[0]}年 ${parseInt(targetDate.split('-')[1])}月` : `${targetDate}年`}</span>
          </h2>
          <button onClick={() => changePeriod(1)} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronRight size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100">
            <p className="text-xs font-bold text-rose-400 mb-1">支出</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-3xl border border-teal-100">
            <p className="text-xs font-bold text-teal-400 mb-1">収入</p>
            <p className="text-xl font-bold text-teal-600">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        
        {(() => {
          const balance = totalIncome - totalExpense;
          return (
            <div className={`p-4 rounded-3xl border mb-6 flex justify-center items-center gap-4 ${balance < 0 ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-sm font-bold ${balance < 0 ? 'text-rose-400' : 'text-gray-500'}`}>収支</p>
              <p className={`text-xl font-bold tracking-tight ${balance < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                {balance > 0 ? '+' : ''}{formatCurrency(balance)}
              </p>
            </div>
          );
        })()}

        <div className="flex bg-orange-50 rounded-2xl p-1 mb-4">
          <button className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${reportType === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400'}`}
            onClick={() => setReportType('expense')}>支出</button>
          <button className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${reportType === 'income' ? 'bg-white text-teal-500 shadow-sm' : 'text-gray-400'}`}
            onClick={() => setReportType('income')}>収入</button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-4 border border-orange-50 mb-6">
          <h3 className="font-bold text-gray-600 mb-2 flex items-center gap-2">
            <PieChartIcon size={18} className="text-orange-400"/> {reportType === 'expense' ? '支出' : '収入'}の割合
          </h3>
          {chartData.length > 0 ? (
            <div className="h-64 w-full relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-[10px] font-bold text-gray-400">合計{reportType === 'expense' ? '支出' : '収入'}</span>
                <span className="text-lg font-bold text-gray-700 leading-tight">{formatCurrency(reportType === 'expense' ? totalExpense : totalIncome)}</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip itemStyle={{ color: '#374151', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Legend 
                    verticalAlign="bottom"
                    content={() => {
                      const sortedItems = [...chartData].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
                      return (
                        <div className="flex flex-wrap justify-center items-center gap-3 pt-4">
                          {sortedItems.map((entry, index) => (
                            <div key={`item-${index}`} className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm font-bold text-gray-600">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">データがありません</div>
          )}

          {/* 全カテゴリー詳細リスト (0円含む) */}
          <div className="mt-6 space-y-3 pt-4 border-t border-gray-100">
            <h4 className="font-bold text-gray-500 text-sm mb-3 ml-1 flex items-center gap-2">
              <ListPlus size={16} /> カテゴリー別詳細
            </h4>
            {allCategoriesData.map((item, index) => {
              const Icon = ICON_MAP[item.icon] || Zap;
              const isZero = item.value === 0;
              return (
                <div 
                  key={index} 
                  onClick={() => {
                    if (item.id) setSelectedCategoryId(item.id);
                  }}
                  className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer hover:bg-orange-50/50 ${isZero ? 'bg-gray-50/50 border-transparent' : 'bg-white border-gray-100 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isZero ? 'opacity-40 grayscale' : 'shadow-sm'}`} style={{ backgroundColor: item.color }}>
                      <Icon size={18} />
                    </div>
                    <span className={`font-bold text-sm ${isZero ? 'text-gray-400' : 'text-gray-700'}`}>{item.name}</span>
                  </div>
                  <span className={`font-bold ${isZero ? 'text-gray-400' : 'text-gray-700'}`}>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const AssetScreen = () => {
    const [targetYear, setTargetYear] = useState(parseInt(currentYearStr, 10));
    const [inputMonth, setInputMonth] = useState(currentMonthStr);
    
    const handleAssetInputChange = (e) => {
      const rawVal = e.target.value.replace(/[^0-9]/g, '');
      if (rawVal) {
        e.target.value = Number(rawVal).toLocaleString();
      } else {
        e.target.value = '';
      }
    };
    // 資産の親カテゴリ一覧
    const assetParentCategories = activeParentCategories.filter(c => c.type === 'asset');
    
    const getAssetsForMonth = (monthStr) => assets.filter(a => a.month === monthStr);
    const currentMonthAssets = getAssetsForMonth(inputMonth);
    const currentTotal = currentMonthAssets.reduce((sum, a) => sum + a.amount, 0);

    const displayParentCategories = useMemo(() => {
      const parents = [...assetParentCategories];
      currentMonthAssets.forEach(a => {
        const pId = getParentId(a.categoryId);
        if (!parents.find(p => p.id === pId)) {
          const cat = categories.find(c => c.id === pId);
          if (cat) parents.push(cat);
        }
      });
      return parents.sort((a, b) => {
        if (a.deleted && !b.deleted) return 1;
        if (!a.deleted && b.deleted) return -1;
        return (a.order || 0) - (b.order || 0);
      });
    }, [assetParentCategories, currentMonthAssets, categories]);

    const getDisplaySubCategories = (parentId) => {
      const subs = [...getActiveSubCategories(parentId)];
      currentMonthAssets.forEach(a => {
        if (getParentId(a.categoryId) === parentId && a.categoryId !== parentId) {
          if (!subs.find(s => s.id === a.categoryId)) {
            const cat = categories.find(c => c.id === a.categoryId);
            if (cat) subs.push(cat);
          }
        }
      });
      return subs.sort((a, b) => {
        if (a.deleted && !b.deleted) return 1;
        if (!a.deleted && b.deleted) return -1;
        return (a.order || 0) - (b.order || 0);
      });
    };

    const [y, m] = inputMonth.split('-');
    const prevDate = new Date(parseInt(y, 10), parseInt(m, 10) - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthAssets = getAssetsForMonth(prevMonthStr);
    const prevTotal = prevMonthAssets.reduce((sum, a) => sum + a.amount, 0);
    const momDiff = currentTotal - prevTotal;

    // 積み上げ棒グラフ用データ構築（親カテゴリの名前単位で合算）
    const barChartData = useMemo(() => {
      const data = [];
      for (let i = 1; i <= 12; i++) {
        const mStr = `${targetYear}-${String(i).padStart(2, '0')}`;
        const monthAssets = getAssetsForMonth(mStr);
        
        const dataPoint = { name: `${i}月` };
        monthAssets.forEach(a => {
          const pId = getParentId(a.categoryId);
          const cat = categories.find(c => c.id === pId);
          if (cat) {
            const amount = Number(a.amount) || 0;
            dataPoint[cat.name] = (dataPoint[cat.name] || 0) + amount;
          }
        });
        
        dataPoint.total = monthAssets.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        data.push(dataPoint);
      }
      return data;
    }, [assets, targetYear, categories]);

    const handleSaveAsset = async (categoryId, amountStr) => {
      const amount = parseInt(amountStr, 10);
      if (isNaN(amount)) {
        return;
      }

      const docId = `${inputMonth}_${categoryId}`;
      const payload = {
        month: inputMonth,
        categoryId,
        amount,
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, `${getBasePath()}/assets/${docId}`), payload);
      } catch (err) {
        console.error("資産保存エラー", err);
        alert("資産の保存に失敗しました");
      }
    };

    // 親カテゴリのみを逆順にスタックする。
    // 手入力可能なアクティブな親カテゴリだけでなく、データが存在する隠しカテゴリも含める。
    // 同じ名前のカテゴリは統合（一意に）する。
    const uniqueCategories = useMemo(() => {
      const catMap = new Map();
      
      // まずアクティブなものを登録
      assetParentCategories.forEach(c => {
        if (!catMap.has(c.name)) {
          catMap.set(c.name, { id: c.name, name: c.name, color: c.color });
        }
      });
      
      // 次にデータがあるものを登録（アクティブなものがあれば色などは上書きしない）
      assets.forEach(a => {
        const pId = getParentId(a.categoryId);
        const cat = categories.find(c => c.id === pId);
        if (cat && !catMap.has(cat.name)) {
          catMap.set(cat.name, { id: cat.name, name: cat.name, color: cat.color });
        }
      });
      
      return Array.from(catMap.values());
    }, [assetParentCategories, assets, categories]);

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
        
        {/* 入力部分（月指定） */}
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm mb-4 border border-orange-50">
          <button onClick={() => {
             const d = new Date(parseInt(y, 10), parseInt(m, 10) - 2, 1);
             setInputMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronLeft size={20}/></button>
          <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            <Landmark size={20} className="text-orange-400"/>
            <span>{`${parseInt(y, 10)}年 ${parseInt(m, 10)}月末の資産`}</span>
          </h2>
          <button onClick={() => {
             const d = new Date(parseInt(y, 10), parseInt(m, 10), 1);
             setInputMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }} className="p-2 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-100"><ChevronRight size={20}/></button>
        </div>

        {/* 資産サマリー */}
        <div className="bg-gradient-to-br from-orange-400 to-rose-400 p-6 rounded-3xl text-white shadow-md mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><PiggyBank size={80}/></div>
          <p className="text-sm font-bold opacity-90 mb-1">総資産額</p>
          <p className="text-3xl font-black tracking-wider mb-4">{formatCurrency(currentTotal)}</p>
          
          <div className="flex gap-4">
            <div className="bg-white/20 p-3 rounded-2xl flex-1 backdrop-blur-sm">
              <p className="text-[10px] font-bold mb-1">先月比</p>
              <div className="flex items-center gap-1">
                {momDiff > 0 ? <TrendingUp size={14} className="text-green-200"/> : momDiff < 0 ? <TrendingDown size={14} className="text-rose-200"/> : null}
                <span className="font-bold text-sm">{momDiff > 0 ? '+' : ''}{formatCurrency(momDiff)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 資産入力フォーム */}
        <div className="bg-white rounded-3xl shadow-sm p-4 border border-orange-50 mb-6">
          <h3 className="font-bold text-gray-600 mb-4 flex items-center gap-2">
            <Edit3 size={18} className="text-orange-400"/> 各項目の残高入力
          </h3>
          <div className="space-y-4">
            {displayParentCategories.map(parentCat => {
              const PIcon = ICON_MAP[parentCat.icon] || Landmark;
              const pAsset = currentMonthAssets.find(a => a.categoryId === parentCat.id);
              const pVal = pAsset ? pAsset.amount : '';
              
              // この親に紐づくサブカテゴリ
              const subs = getDisplaySubCategories(parentCat.id);

              return (
                <div key={parentCat.id} className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                  {/* 親の入力欄 */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: parentCat.color }}>
                      <PIcon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-700 mb-1">{parentCat.name}{parentCat.deleted ? <span className="text-red-400 ml-1">(削除済み)</span> : ''}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">¥</span>
                        <input 
                          key={`${inputMonth}_${parentCat.id}`}
                          type="text" 
                          inputMode="numeric"
                          defaultValue={pVal ? Number(pVal).toLocaleString() : ''}
                          placeholder="0"
                          onChange={handleAssetInputChange}
                          onBlur={(e) => handleSaveAsset(parentCat.id, e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-7 pr-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-orange-200 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 子の入力欄 */}
                  {subs.length > 0 && (
                    <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                      {subs.map(subCat => {
                        const sAsset = currentMonthAssets.find(a => a.categoryId === subCat.id);
                        const sVal = sAsset ? sAsset.amount : '';
                        return (
                          <div key={subCat.id} className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><CornerDownRight size={12}/>{subCat.name}{subCat.deleted ? <span className="text-red-400 ml-1">(削除済み)</span> : ''}</p>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 font-bold text-xs">¥</span>
                                <input 
                                  key={`${inputMonth}_${subCat.id}`}
                                  type="text" 
                                  inputMode="numeric"
                                  defaultValue={sVal ? Number(sVal).toLocaleString() : ''}
                                  placeholder="0"
                                  onChange={handleAssetInputChange}
                                  onBlur={(e) => handleSaveAsset(subCat.id, e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-white border border-gray-100 rounded-lg py-1.5 pl-6 pr-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-orange-200 outline-none" 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center">※入力欄からカーソルを外すと自動保存されます</p>
        </div>

        {/* グラフ部分（年指定） */}
        <div className="bg-white rounded-3xl shadow-sm border border-orange-50 p-4 mb-6">
          <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-2xl">
            <button onClick={() => setTargetYear(prev => prev - 1)} className="p-2 bg-white text-orange-400 rounded-xl shadow-sm hover:bg-orange-50"><ChevronLeft size={20}/></button>
            <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
              <BarChart2 size={20} className="text-orange-400"/>
              <span>{`${targetYear}年の推移`}</span>
            </h2>
            <button onClick={() => setTargetYear(prev => prev + 1)} className="p-2 bg-white text-orange-400 rounded-xl shadow-sm hover:bg-orange-50"><ChevronRight size={20}/></button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barChartData} 
                margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af' }} 
                  width={40}
                  tickFormatter={(val) => {
                    if (typeof val !== 'number' || isNaN(val)) return '';
                    return val >= 10000 ? `${Math.floor(val/10000)}万` : val;
                  }}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const validPayload = payload.filter(entry => (Number(entry.value) || 0) > 0);
                      if (validPayload.length === 0) return null;

                      const total = validPayload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                      const sortedPayload = [...validPayload].sort((a, b) => {
                        const keyA = a.name || a.dataKey;
                        const keyB = b.name || b.dataKey;
                        const idxA = uniqueCategories.findIndex(c => c.id === keyA || c.name === keyA);
                        const idxB = uniqueCategories.findIndex(c => c.id === keyB || c.name === keyB);
                        return idxA - idxB;
                      });
                      
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 text-[12px] font-bold text-gray-700 min-w-[160px]">
                          <div className="text-gray-500 mb-2 border-b border-gray-100 pb-1 flex justify-between items-center gap-4">
                            <span>{label}</span>
                            <span className="text-gray-800">合計: {formatCurrency(total)}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {sortedPayload.map((entry, index) => (
                              <div key={index} className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                  <span className="text-gray-700">{entry.name}</span>
                                </div>
                                <span className="text-gray-700">{formatCurrency(Number(entry.value) || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs font-bold text-gray-600">
                      {uniqueCategories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <span>{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
                
                {[...uniqueCategories].reverse().map(cat => (
                  <Bar key={cat.id} dataKey={cat.id} stackId="a" fill={cat.color} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  };


  const FutureScreen = () => {
    const [age, setAge] = useState(30);
    const [targetAge, setTargetAge] = useState(65);
    const [returnRate, setReturnRate] = useState(5.0);
    const [monthlyInvestment, setMonthlyInvestment] = useState(30000);
    const [targetAssetIds, setTargetAssetIds] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const scrollRef = useRef(null);
    const [tooltipPos, setTooltipPos] = useState(null);

    useEffect(() => {
      const docRef = doc(db, `${getBasePath()}/settings/simulation`);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.age !== undefined) setAge(data.age);
          if (data.targetAge !== undefined) setTargetAge(data.targetAge);
          if (data.returnRate !== undefined) setReturnRate(data.returnRate);
          if (data.monthlyInvestment !== undefined) setMonthlyInvestment(data.monthlyInvestment);
          if (data.targetAssetIds !== undefined) setTargetAssetIds(data.targetAssetIds);
        }
      });
      return () => unsub();
    }, [activeWorkspace]);

    const saveSettings = async (newData) => {
      await setDoc(doc(db, `${getBasePath()}/settings/simulation`), newData, { merge: true });
    };

    const handleTargetAssetToggle = (id) => {
      const newIds = targetAssetIds.includes(id) 
        ? targetAssetIds.filter(i => i !== id)
        : [...targetAssetIds, id];
      setTargetAssetIds(newIds);
      saveSettings({ targetAssetIds: newIds });
    };

    const latestMonth = useMemo(() => {
      if (!assets || assets.length === 0) return currentMonthStr;
      const months = [...new Set(assets.map(a => a.month))];
      months.sort((a, b) => b.localeCompare(a));
      return months[0];
    }, [assets, currentMonthStr]);

    const initialInvested = useMemo(() => {
      return targetAssetIds.reduce((sum, id) => {
        const monthAssets = assets.filter(a => a.month === latestMonth && getParentId(a.categoryId) === id);
        return sum + monthAssets.reduce((s, a) => s + (Number(a.amount) || 0), 0);
      }, 0);
    }, [assets, targetAssetIds, latestMonth]);

    const initialUninvested = useMemo(() => {
      const monthAssets = assets.filter(a => a.month === latestMonth);
      let total = 0;
      let investedTotal = 0;
      monthAssets.forEach(a => {
        const amt = Number(a.amount) || 0;
        total += amt;
        if (targetAssetIds.includes(getParentId(a.categoryId))) {
          investedTotal += amt;
        }
      });
      return total - investedTotal;
    }, [assets, targetAssetIds, latestMonth]);

    const chartData = useMemo(() => {
      const data = [];
      let currentInvest = initialInvested;
      let currentPrincipal = initialInvested;
      
      const r = returnRate / 100;
      const mRate = r / 12;

      for (let y = age; y <= targetAge; y++) {
        data.push({
          age: String(y),
          uninvested: initialUninvested,
          principal: Math.floor(currentPrincipal),
          profit: Math.floor(Math.max(0, currentInvest - currentPrincipal)),
          total: Math.floor(initialUninvested + currentInvest)
        });
        
        if (y < targetAge) {
          for (let m = 0; m < 12; m++) {
            currentPrincipal += monthlyInvestment;
            currentInvest += monthlyInvestment;
            currentInvest *= (1 + mRate);
          }
        }
      }
      return data;
    }, [age, targetAge, returnRate, monthlyInvestment, initialInvested, initialUninvested]);

    const formatShortCurrency = (val) => {
      if (val >= 100000000) return `${(val/100000000).toFixed(1)}億円`;
      if (val >= 10000) return `${Math.floor(val/10000).toLocaleString()}万円`;
      return `${val.toLocaleString()}円`;
    };

    const assetParents = activeParentCategories.filter(c => c.type === 'asset');

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
        
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-6 rounded-3xl text-white shadow-md mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Rocket size={80}/></div>
          <p className="text-sm font-bold opacity-90 mb-1">{targetAge}歳時点の予想資産</p>
          <p className="text-3xl font-black tracking-wider">{formatCurrency(chartData[chartData.length - 1]?.total || 0)}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-indigo-50 p-4 mb-6">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
            className="w-full flex justify-between items-center font-bold text-gray-700"
          >
            <div className="flex items-center gap-2"><Settings2 size={18} className="text-indigo-400"/> シミュレーション設定</div>
            {isSettingsOpen ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
          </button>
          
          {isSettingsOpen && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">現在の年齢</label>
                  <div className="relative">
                    <input type="number" value={age} onChange={(e) => { setAge(Number(e.target.value)); saveSettings({ age: Number(e.target.value) }); }} className="w-full bg-gray-50 rounded-xl p-2 font-bold text-gray-700 outline-none pr-8 text-right"/>
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold">歳</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">目標年齢</label>
                  <div className="relative">
                    <input type="number" value={targetAge} onChange={(e) => { setTargetAge(Number(e.target.value)); saveSettings({ targetAge: Number(e.target.value) }); }} className="w-full bg-gray-50 rounded-xl p-2 font-bold text-gray-700 outline-none pr-8 text-right"/>
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold">歳</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">想定利回り (年利)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={returnRate} onChange={(e) => { setReturnRate(Number(e.target.value)); saveSettings({ returnRate: Number(e.target.value) }); }} className="w-full bg-gray-50 rounded-xl p-2 font-bold text-gray-700 outline-none pr-8 text-right"/>
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold">%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">毎月の積立額</label>
                  <div className="relative">
                    <input type="text" inputMode="numeric" value={monthlyInvestment ? Number(monthlyInvestment).toLocaleString() : ''} onChange={(e) => { 
                      const rawVal = e.target.value.replace(/[^0-9]/g, '');
                      const num = Number(rawVal);
                      setMonthlyInvestment(num); 
                      saveSettings({ monthlyInvestment: num }); 
                    }} className="w-full bg-gray-50 rounded-xl p-2 font-bold text-gray-700 outline-none pr-8 text-right"/>
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold">円</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-2">運用する資産 (利回りで増える項目)</label>
                <div className="grid grid-cols-2 gap-2">
                  {assetParents.map(cat => {
                    const isChecked = targetAssetIds.includes(cat.id);
                    return (
                      <button key={cat.id} onClick={() => handleTargetAssetToggle(cat.id)} className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          {cat.name}
                        </div>
                        {isChecked && <Check size={14} className="text-indigo-500" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-indigo-50 p-4 mb-6">
          <h3 className="font-bold text-gray-600 mb-4 flex items-center gap-2">
            <LineChartIcon size={18} className="text-indigo-400"/> 資産推移シミュレーション
          </h3>
          <div className="overflow-x-auto pb-4" ref={scrollRef}>
            <div style={{ width: `${Math.max(300, (targetAge - age + 1) * 40)}px`, height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  onMouseMove={(state) => {
                    if (state && state.activeCoordinate && scrollRef.current) {
                      const svgX = state.activeCoordinate.x;
                      const scrollLeft = scrollRef.current.scrollLeft;
                      const clientWidth = scrollRef.current.clientWidth;
                      const screenX = svgX - scrollLeft;
                      
                      let tooltipX;
                      if (screenX > clientWidth / 2) {
                        tooltipX = svgX - 230; // 左に出す
                      } else {
                        tooltipX = svgX + 10; // 右に出す
                      }
                      setTooltipPos({ x: tooltipX, y: 10 });
                    }
                  }}
                  onMouseLeave={() => setTooltipPos(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${v}歳`} axisLine={false} tickLine={false} dy={5} />
                  <YAxis tick={false} axisLine={false} tickLine={false} width={0} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    position={tooltipPos}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length && tooltipPos) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-indigo-100 text-[12px] font-bold text-gray-700 w-auto min-w-[220px]">
                            <div className="text-gray-500 mb-3 border-b border-gray-100 pb-2 flex justify-between items-center gap-4 whitespace-nowrap">
                              <span className="text-sm">{label}歳</span>
                              <span className="text-indigo-600 font-black text-sm">合計: {formatCurrency(data.total)}</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex justify-between items-center gap-3 whitespace-nowrap">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm"></div><span className="text-gray-700 text-sm">運用益</span></div>
                                <span className="text-rose-500 font-bold text-sm">+{formatCurrency(data.profit)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-3 whitespace-nowrap">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-400 shadow-sm"></div><span className="text-gray-700 text-sm">投資元本</span></div>
                                <span className="text-gray-700 font-bold text-sm">{formatCurrency(data.principal)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-3 whitespace-nowrap">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300 shadow-sm"></div><span className="text-gray-700 text-sm">現金など</span></div>
                                <span className="text-gray-700 font-bold text-sm">{formatCurrency(data.uninvested)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="uninvested" stackId="a" fill="#d1d5db" />
                  <Bar dataKey="principal" stackId="a" fill="#818cf8" />
                  <Bar dataKey="profit" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">※グラフを横にスクロールできます</p>
        </div>

      </div>
    );
  };


  const SettingsScreen = () => {
    const [editMode, setEditMode] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newCat, setNewCat] = useState({ name: '', type: 'expense', icon: 'home', color: COLOR_PALETTE[0], parentId: '' });
    const [isImporting, setIsImporting] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [workspaceInput, setWorkspaceInput] = useState('');

    const handleCreateGroup = async () => {
      if (!newWorkspaceName.trim()) return;
      const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      try {
        await setDoc(doc(db, 'artifacts', appId, 'groups', groupId, 'metadata', 'info'), {
          name: newWorkspaceName,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          code: code
        });

        await setDoc(doc(db, 'artifacts', appId, 'invitations', code), {
          groupId: groupId,
          name: newWorkspaceName
        });

        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
        const newGroups = workspaces.filter(w => w.id !== 'personal').concat([{ id: groupId, name: newWorkspaceName, code: code }]);
        await setDoc(profileRef, { joinedGroups: newGroups }, { merge: true });

        setNewWorkspaceName('');
        alert(`新しいグループ「${newWorkspaceName}」を作成しました！`);
      } catch (err) {
        console.error(err);
        alert('グループの作成に失敗しました。');
      }
    };

    const handleJoinGroup = async () => {
      if (workspaceInput.trim().length < 6) return;
      const code = workspaceInput.trim().toUpperCase();
      
      try {
        const inviteRef = doc(db, 'artifacts', appId, 'invitations', code);
        const docSnap = await getDoc(inviteRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
          
          if (workspaces.find(w => w.id === data.groupId)) {
            alert('すでにこのグループに参加しています。');
            setWorkspaceInput('');
            return;
          }

          const newGroups = workspaces.filter(w => w.id !== 'personal').concat([{ id: data.groupId, name: data.name, code: code }]);
          await setDoc(profileRef, { joinedGroups: newGroups }, { merge: true });
          
          setWorkspaceInput('');
          alert(`「${data.name}」に参加しました！`);
        } else {
          alert('無効な招待コードです。');
        }
      } catch (err) {
        console.error(err);
        alert('参加処理に失敗しました。');
      }
    };

    const handleLeaveGroup = async (groupId, groupName) => {
      showConfirm(`グループ「${groupName}」を退出（削除）しますか？\n(データ自体は消えません)`, async () => {
        try {
          const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
          const newGroups = workspaces.filter(w => w.id !== 'personal' && w.id !== groupId);
          await setDoc(profileRef, { joinedGroups: newGroups }, { merge: true });
          
          if (activeWorkspace === groupId) {
            setActiveWorkspace('personal');
          }
          alert(`「${groupName}」を退出しました。`);
        } catch (err) {
          console.error(err);
          alert('退出に失敗しました。');
        }
        closeConfirm();
      });
    };

    const handleEditCategoryClick = (cat) => {
      setEditingCategoryId(cat.id);
      setNewCat({
        name: cat.name,
        type: cat.type,
        icon: cat.icon || 'home',
        color: cat.color || COLOR_PALETTE[0],
        parentId: cat.parentId || ''
      });
      setEditMode(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleAddCategory = async (e) => {
      e.preventDefault();
      if (!newCat.name) return;

      try {
        if (editingCategoryId) {
          const payload = {
            name: newCat.name,
            type: newCat.type,
            icon: newCat.icon,
            color: newCat.color,
            parentId: newCat.parentId || null
          };
          await setDoc(doc(db, `${getBasePath()}/categories/${editingCategoryId}`), payload, { merge: true });
        } else {
          const catId = `cat_${newCat.type}_${crypto.randomUUID().slice(0,8)}`;
          const payload = {
            name: newCat.name,
            type: newCat.type,
            icon: newCat.icon,
            color: newCat.color,
            parentId: newCat.parentId || null,
            id: catId,
            order: categories.filter(c => c.type === newCat.type).length + 1
          };
          await setDoc(doc(db, `${getBasePath()}/categories/${catId}`), payload);
        }
        
        setNewCat({ name: '', type: 'expense', icon: 'home', color: COLOR_PALETTE[0], parentId: '' });
        setEditingCategoryId(null);
        setEditMode(false);
      } catch (err) {
        console.error("カテゴリ保存エラー", err);
        alert("項目の保存に失敗しました");
      }
    };

    const handleDeleteCategory = (id) => {
      showConfirm("この項目を削除しますか？\n(過去の記録には名前がそのまま残ります)", async () => {
        // 論理削除（deletedフラグを立てる）
        await setDoc(doc(db, `${getBasePath()}/categories/${id}`), { deleted: true }, { merge: true });
        if (editingCategoryId === id) {
          setEditingCategoryId(null);
          setEditMode(false);
        }
        closeConfirm();
      });
    };

    const handleMoveCategory = async (e, cat, direction) => {
      e.stopPropagation();
      // 親なら同じtypeの親同士、サブなら同じ親を持つサブ同士を取得
      let siblings = cat.parentId 
        ? getActiveSubCategories(cat.parentId) 
        : activeParentCategories.filter(c => c.type === cat.type);
        
      const idx = siblings.findIndex(c => c.id === cat.id);
      const targetIdx = idx + direction;
      
      if (targetIdx < 0 || targetIdx >= siblings.length) return;
      
      const newSiblings = [...siblings];
      [newSiblings[idx], newSiblings[targetIdx]] = [newSiblings[targetIdx], newSiblings[idx]];
      
      try {
        const promises = newSiblings.map((c, i) => 
          setDoc(doc(db, `${getBasePath()}/categories/${c.id}`), { order: i + 1 }, { merge: true })
        );
        await Promise.all(promises);
      } catch (err) {
        console.error("並び替えエラー", err);
      }
    };

    const currentParents = activeParentCategories.filter(c => c.type === newCat.type);

    const handleExportCSV = () => {
      let csv = "日付,種類,カテゴリ,金額,メモ\n";
      transactions.forEach(tx => {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat ? cat.name : '不明';
        const typeStr = tx.type === 'expense' ? '支出' : '収入';
        const memo = tx.memo || '';
        csv += `${tx.date},${typeStr},${catName},${tx.amount},${memo}\n`;
      });
      
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kakeibo_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleImportCSV = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsImporting(true);

      // UIの描画（ローディング表示）を確実に行うために少し遅延させる
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target.result;
          const lines = text.split('\n');
          let importCount = 0;
          const newCategoryCache = {};

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',');
            if (cols.length < 4) continue;
            
            let [date, typeStr, catName, amountStr, memo] = cols;
            
            // 日付の自動変換 (例: "2011/12/31 0:00" -> "2011-12-31")
            const d = parseSafeDate(date);
            if (!isNaN(d.getTime())) {
              date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            const type = typeStr === '支出' ? 'expense' : typeStr === '収入' ? 'income' : null;
            const amount = parseInt(amountStr, 10);
            
            if (!date || !type || isNaN(amount)) continue;

            let categoryId = null;
            let existingCat = categories.find(c => c.name === catName && c.type === type && !c.deleted);
            if (!existingCat) {
              existingCat = categories.find(c => c.name === catName && c.type === type);
            }
            
            if (existingCat) {
              categoryId = existingCat.id;
            } else if (newCategoryCache[catName]) {
              categoryId = newCategoryCache[catName];
            } else {
              categoryId = `cat_${type}_${crypto.randomUUID().slice(0,8)}`;
              const payload = {
                id: categoryId,
                name: catName,
                type: type,
                icon: 'help-circle',
                color: '#d1d5db',
                parentId: null,
                deleted: true,
                order: 999
              };
              await setDoc(doc(db, `${getBasePath()}/categories/${categoryId}`), payload);
              newCategoryCache[catName] = categoryId;
            }

            const txId = `tx_${crypto.randomUUID()}`;
            const txPayload = {
              id: txId,
              date,
              type,
              categoryId,
              amount,
              memo: memo || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, `${getBasePath()}/transactions/${txId}`), txPayload);
            importCount++;
          }
          
          alert(`${importCount}件の記録をインポートしました！`);
          setIsImporting(false);
          setImportModal({ isOpen: false, type: null });
          e.target.value = '';
        };
        reader.readAsText(file);
      }, 100);
    };

    const handleExportAssetCSV = () => {
      let csv = "年月,カテゴリ,金額\n";
      assets.forEach(a => {
        const cat = categories.find(c => c.id === a.categoryId);
        const catName = cat ? cat.name : '不明';
        csv += `${a.month},${catName},${a.amount}\n`;
      });
      
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assets_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleImportAssetCSV = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsImporting(true);

      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target.result;
          const lines = text.split('\n');
          let importCount = 0;
          const newCategoryCache = {};

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',');
            if (cols.length < 3) continue;
            
            let [monthStr, catName, amountStr] = cols;
            
            // 年月の自動変換 (例: "2011/12/31 0:00" -> "2011-12")
            const d = parseSafeDate(monthStr);
            if (!isNaN(d.getTime())) {
              monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }

            const amount = parseInt(amountStr, 10);
            
            if (!monthStr || isNaN(amount)) continue;

            let categoryId = null;
            let existingCat = categories.find(c => c.name === catName && c.type === 'asset' && !c.deleted);
            if (!existingCat) {
              existingCat = categories.find(c => c.name === catName && c.type === 'asset');
            }
            
            if (existingCat) {
              categoryId = existingCat.id;
            } else if (newCategoryCache[catName]) {
              categoryId = newCategoryCache[catName];
            } else {
              categoryId = `cat_asset_${crypto.randomUUID().slice(0,8)}`;
              const payload = {
                id: categoryId,
                name: catName,
                type: 'asset',
                icon: 'landmark',
                color: '#d1d5db',
                parentId: null,
                deleted: true,
                order: 999
              };
              await setDoc(doc(db, `${getBasePath()}/categories/${categoryId}`), payload);
              newCategoryCache[catName] = categoryId;
            }

            const docId = `${monthStr}_${categoryId}`;
            const payload = {
              month: monthStr,
              categoryId,
              amount,
              updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, `${getBasePath()}/assets/${docId}`), payload);
            importCount++;
          }
          
          alert(`${importCount}件の資産記録をインポートしました！`);
          setIsImporting(false);
          setImportModal({ isOpen: false, type: null });
          e.target.value = '';
        };
        reader.readAsText(file);
      }, 100);
    };

    const [isDeleting, setIsDeleting] = useState(false);
    const [bulkDeleteState, setBulkDeleteState] = useState({
      target: 'expense',
      periodType: 'month',
      year: new Date().getFullYear().toString(),
      month: String(new Date().getMonth() + 1).padStart(2, '0')
    });

    const handleBulkDelete = () => {
      let message = "";
      if (bulkDeleteState.target === 'expense') {
        message += "【家計簿データ】\n";
      } else {
        message += "【資産データ】\n";
      }
      
      let prefix = "";
      if (bulkDeleteState.periodType === 'month') {
        prefix = `${bulkDeleteState.year}-${bulkDeleteState.month}`;
        message += `${bulkDeleteState.year}年${bulkDeleteState.month}月のデータを一括削除します。\n\n`;
      } else if (bulkDeleteState.periodType === 'year') {
        prefix = `${bulkDeleteState.year}-`;
        message += `${bulkDeleteState.year}年のデータを一括削除します。\n\n`;
      } else {
        message += `すべてのデータを一括削除します。\n\n`;
      }
      
      message += "本当によろしいですか？（この操作は取り消せません）";

      showConfirm(message, async () => {
        // 先に確認モーダルを閉じる
        closeConfirm();
        // 削除中モーダルを表示
        setIsDeleting(true);
        
        try {
          if (bulkDeleteState.target === 'expense') {
            const targets = transactions.filter(tx => {
              if (bulkDeleteState.periodType === 'all') return true;
              return tx.date.startsWith(prefix);
            });
            const promises = targets.map(tx => deleteDoc(doc(db, `${getBasePath()}/transactions/${tx.id}`)));
            await Promise.all(promises);
            alert(`${targets.length}件の家計簿データを削除しました。`);
          } else {
            const targets = assets.filter(a => {
              if (bulkDeleteState.periodType === 'all') return true;
              return a.month.startsWith(prefix);
            });
            const promises = targets.map(a => deleteDoc(doc(db, `${getBasePath()}/assets/${a.month}_${a.categoryId}`)));
            await Promise.all(promises);
            alert(`${targets.length}件の資産データを削除しました。`);
          }
        } catch (err) {
          console.error("削除エラー", err);
          alert("削除に失敗しました。");
        }
        setIsDeleting(false);
      });
    };

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
        <h2 className="font-bold text-gray-700 text-xl mb-4 flex items-center gap-2">
          <Settings size={22} className="text-orange-400"/> 設定・項目カスタマイズ
        </h2>

        {/* 共有設定セクション */}
        <div className="bg-white rounded-3xl shadow-sm p-4 border border-orange-50 mb-6 space-y-6">
          <div>
            <h3 className="font-bold text-gray-600 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Users size={18} className="text-gray-400" /> 共有設定（家族・友達と共有）
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              新しい家計簿グループを作って家族や友達を招待したり、招待コードを入力してグループに参加できます。
            </p>

            <div className="space-y-4">
              {/* グループ新規作成 */}
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Plus size={14}/> 新しいグループ家計簿を作る</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例：家族用、旅行用"
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-orange-400"
                  />
                  <button 
                    onClick={handleCreateGroup}
                    disabled={!newWorkspaceName.trim()}
                    className="bg-orange-400 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl shadow-sm transition-colors text-sm whitespace-nowrap"
                  >
                    作成
                  </button>
                </div>
              </div>

              {/* 招待コードで参加 */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><UserPlus size={14}/> 招待コードで参加する</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="6桁のコードを入力"
                    value={workspaceInput}
                    onChange={e => setWorkspaceInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-gray-400 uppercase tracking-widest"
                  />
                  <button 
                    onClick={handleJoinGroup}
                    disabled={workspaceInput.trim().length < 6}
                    className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white font-bold px-4 rounded-xl shadow-sm transition-colors text-sm whitespace-nowrap"
                  >
                    参加
                  </button>
                </div>
              </div>
              
              {/* 参加中のグループ一覧（招待コード確認） */}
              {workspaces.filter(w => w.id !== 'personal').length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Key size={14}/> あなたが参加中のグループ</label>
                  <div className="space-y-2">
                    {workspaces.filter(w => w.id !== 'personal').map(w => (
                      <div key={w.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                        <span className="font-bold text-sm text-gray-700">{w.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-bold">招待コード:</span>
                          <span className="bg-gray-100 text-gray-700 font-black tracking-widest px-2 py-1 rounded-lg text-xs">{w.code}</span>
                          <button 
                            onClick={() => handleLeaveGroup(w.id, w.name)}
                            className="ml-2 text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {['expense', 'income', 'asset'].map(type => {
          const typeParents = activeParentCategories.filter(c => c.type === type);
          return (
          <div key={type} className="bg-white rounded-3xl shadow-sm p-4 border border-orange-50 mb-4">
            <h3 className="font-bold text-gray-600 mb-3 border-b border-gray-100 pb-2">
              {type === 'expense' ? '支出の項目' : type === 'income' ? '収入の項目' : '資産の項目'}
            </h3>
            <div className="flex flex-col gap-3">
              {typeParents.map((parentCat, pIdx) => {
                const Icon = ICON_MAP[parentCat.icon] || Zap;
                const subs = getActiveSubCategories(parentCat.id);
                
                return (
                  <div key={parentCat.id} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 hover:border-orange-200 transition-colors">
                    <div 
                      className="flex items-center gap-2 mb-2 cursor-pointer"
                      onClick={() => handleEditCategoryClick(parentCat)}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: parentCat.color }}>
                        <Icon size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-700 flex-1">{parentCat.name}</span>
                      
                      <div className="flex flex-col border-r border-gray-200 pr-2 mr-1">
                        <button disabled={pIdx === 0} onClick={(e) => handleMoveCategory(e, parentCat, -1)} className="text-gray-300 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronUp size={14} />
                        </button>
                        <button disabled={pIdx === typeParents.length - 1} onClick={(e) => handleMoveCategory(e, parentCat, 1)} className="text-gray-300 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(parentCat.id); }} className="text-gray-300 hover:text-red-400 p-1">
                        <X size={16} />
                      </button>
                    </div>
                    
                    {/* サブカテゴリの表示 */}
                    {subs.length > 0 && (
                      <div className="flex flex-wrap gap-2 ml-4 pl-4 border-l-2 border-gray-200">
                        {subs.map((subCat, sIdx) => (
                          <div key={subCat.id} 
                            onClick={() => handleEditCategoryClick(subCat)}
                            className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm cursor-pointer hover:border-orange-300 transition-colors"
                          >
                            <CornerDownRight size={12} className="text-gray-400"/>
                            <span className="text-[10px] font-bold text-gray-600">{subCat.name}</span>
                            
                            <div className="flex gap-0.5 ml-1 border-x border-gray-100 px-1">
                              <button disabled={sIdx === 0} onClick={(e) => handleMoveCategory(e, subCat, -1)} className="text-gray-300 hover:text-orange-400 disabled:opacity-30">
                                <ChevronLeft size={12} />
                              </button>
                              <button disabled={sIdx === subs.length - 1} onClick={(e) => handleMoveCategory(e, subCat, 1)} className="text-gray-300 hover:text-orange-400 disabled:opacity-30">
                                <ChevronRight size={12} />
                              </button>
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(subCat.id); }} className="text-gray-300 hover:text-red-400">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

        {!editMode ? (
          <button onClick={() => {
            setEditingCategoryId(null);
            setNewCat({ name: '', type: 'expense', icon: 'home', color: COLOR_PALETTE[0], parentId: '' });
            setEditMode(true);
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
          }} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 mb-8">
            <Plus size={20} /> 新しい項目を作る
          </button>
        ) : (
          <div className="bg-white rounded-3xl shadow-md p-5 border-2 border-orange-100 mb-8 animate-in zoom-in-95">
            <h3 className="font-bold text-gray-600 mb-4 text-center">{editingCategoryId ? '項目の修正' : '項目を作成'}</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">種類</label>
                <div className="flex gap-2">
                  {['expense', 'income', 'asset'].map(t => (
                    <button type="button" key={t} onClick={() => setNewCat({...newCat, type: t, parentId: ''})}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${newCat.type === t ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {t === 'expense' ? '支出' : t === 'income' ? '収入' : '資産'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">階層（親にするか、サブにするか）</label>
                <select 
                  value={newCat.parentId} 
                  onChange={(e) => setNewCat({...newCat, parentId: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">（なし・新しい親カテゴリにする）</option>
                  {currentParents.map(p => (
                    <option key={p.id} value={p.id}>【サブにする】{p.name} の中に入れる</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">項目の名前</label>
                <input type="text" value={newCat.name} onChange={(e) => setNewCat({...newCat, name: e.target.value})} required placeholder="例: 趣味"
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-orange-200 outline-none" />
              </div>

              {/* 親カテゴリを作る時だけアイコンとカラーを選ばせる */}
              {!newCat.parentId && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">アイコン</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                      {Object.keys(ICON_MAP).map(iconKey => {
                        const IconComp = ICON_MAP[iconKey];
                        return (
                          <button type="button" key={iconKey} onClick={() => setNewCat({...newCat, icon: iconKey})}
                            className={`p-2 rounded-xl transition-all ${newCat.icon === iconKey ? 'bg-orange-200 text-orange-600' : 'text-gray-400 hover:bg-gray-200'}`}>
                            <IconComp size={20} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">カラー</label>
                    <div className="flex flex-wrap gap-2 p-2">
                      {COLOR_PALETTE.map(color => (
                        <button type="button" key={color} onClick={() => setNewCat({...newCat, color})}
                          className={`w-8 h-8 rounded-full shadow-sm transition-transform ${newCat.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => {
                  setEditMode(false);
                  setEditingCategoryId(null);
                }} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200">キャンセル</button>
                <button type="submit" className="flex-1 py-3 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 shadow-md">
                  {editingCategoryId ? '修正を保存' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* データ管理セクション */}
        <div className="bg-white rounded-3xl shadow-sm p-4 border border-orange-50 mb-8 space-y-6">
          
          <div>
            <h3 className="font-bold text-gray-600 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Edit3 size={18} className="text-gray-400" /> 家計簿データ (CSV)
            </h3>
            <div className="flex gap-3">
              <button onClick={handleExportCSV} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-gray-200">
                <Download size={18} className="text-gray-400"/> エクスポート
              </button>
              <button onClick={() => setImportModal({ isOpen: true, type: 'expense' })} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-gray-200">
                <Upload size={18} className="text-gray-400"/> インポート
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">※未登録のカテゴリは設定に表示されない隠しカテゴリとして追加されます</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-600 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Landmark size={18} className="text-gray-400" /> 資産データ (CSV)
            </h3>
            <div className="flex gap-3">
              <button onClick={handleExportAssetCSV} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-gray-200">
                <Download size={18} className="text-gray-400"/> エクスポート
              </button>
              <button onClick={() => setImportModal({ isOpen: true, type: 'asset' })} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-gray-200">
                <Upload size={18} className="text-gray-400"/> インポート
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">※年月・カテゴリ名・金額の形式のみ対応します</p>
          </div>
          
          <div className="pt-4 border-t border-gray-100 mt-6">
            <h3 className="font-bold text-gray-600 mb-3 flex items-center gap-2">
              <Trash2 size={18} className="text-rose-400" /> データの一括削除
            </h3>
            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">対象データ</label>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkDeleteState({...bulkDeleteState, target: 'expense'})} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${bulkDeleteState.target === 'expense' ? 'bg-rose-400 text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-100'}`}>家計簿</button>
                    <button onClick={() => setBulkDeleteState({...bulkDeleteState, target: 'asset'})} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${bulkDeleteState.target === 'asset' ? 'bg-rose-400 text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-100'}`}>資産</button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">削除する期間</label>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setBulkDeleteState({...bulkDeleteState, periodType: 'month'})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${bulkDeleteState.periodType === 'month' ? 'bg-rose-200 text-rose-700' : 'bg-white text-gray-400 border border-gray-100'}`}>月指定</button>
                    <button onClick={() => setBulkDeleteState({...bulkDeleteState, periodType: 'year'})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${bulkDeleteState.periodType === 'year' ? 'bg-rose-200 text-rose-700' : 'bg-white text-gray-400 border border-gray-100'}`}>年指定</button>
                    <button onClick={() => setBulkDeleteState({...bulkDeleteState, periodType: 'all'})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${bulkDeleteState.periodType === 'all' ? 'bg-rose-200 text-rose-700' : 'bg-white text-gray-400 border border-gray-100'}`}>すべて</button>
                  </div>

                  {bulkDeleteState.periodType !== 'all' && (
                    <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-rose-50">
                      <select value={bulkDeleteState.year} onChange={e => setBulkDeleteState({...bulkDeleteState, year: e.target.value})} className="flex-1 bg-transparent font-bold text-gray-700 outline-none text-center">
                        {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i + 5).map(y => <option key={y} value={y}>{y}年</option>)}
                      </select>
                      {bulkDeleteState.periodType === 'month' && (
                        <>
                          <span className="text-gray-300">/</span>
                          <select value={bulkDeleteState.month} onChange={e => setBulkDeleteState({...bulkDeleteState, month: e.target.value})} className="flex-1 bg-transparent font-bold text-gray-700 outline-none text-center">
                            {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{parseInt(m, 10)}月</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={handleBulkDelete} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-2">
                  <Trash2 size={16} /> 削除を実行する
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* インポート説明モーダル (SettingsScreen内) */}
        {importModal.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <h3 className="font-bold text-gray-700 text-lg mb-4 text-center border-b border-gray-100 pb-3 flex items-center justify-center gap-2">
                <Upload size={20} className="text-orange-400" />
                {importModal.type === 'expense' ? '家計簿' : '資産'}データのインポート
              </h3>
              
              <div className="bg-orange-50 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-gray-600 mb-2">以下の順番のフォーマットのCSVファイルのみ対応しています。</p>
                {importModal.type === 'expense' ? (
                  <>
                    <p className="text-sm font-black text-rose-500 mb-2 tracking-widest bg-white py-2 px-3 rounded-xl shadow-sm text-center">日付, 種類, カテゴリ, 金額, メモ</p>
                    <p className="text-[10px] font-bold text-gray-400">(例：2026-08-26, 支出, 食費, 1500, スーパー)</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-rose-500 mb-2 tracking-widest bg-white py-2 px-3 rounded-xl shadow-sm text-center">年月, カテゴリ, 金額</p>
                    <p className="text-[10px] font-bold text-gray-400">(例：2026-08, 現金, 500000)</p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setImportModal({ isOpen: false, type: null })} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200">
                  キャンセル
                </button>
                <label className="flex-1 py-3 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 shadow-md flex items-center justify-center cursor-pointer">
                  ファイルを選択
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={importModal.type === 'expense' ? handleImportCSV : handleImportAssetCSV} 
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* インポート中モーダル */}
        {isImporting && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="font-bold text-gray-600">インポート中です...</p>
              <p className="text-xs text-gray-400">そのままお待ちください</p>
            </div>
          </div>
        )}

        {/* 削除中モーダル */}
        {isDeleting && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
              <p className="font-bold text-gray-600">削除しています...</p>
              <p className="text-xs text-gray-400">そのままお待ちください</p>
            </div>
          </div>
        )}

      </div>
    );
  };


  const activeWorkspaceName = workspaces.find(w => w.id === activeWorkspace)?.name || '家計簿';

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800 relative pb-20">
      {/* ヘッダーエリア */}
      <div className="bg-white pt-6 pb-4 px-6 rounded-b-[40px] shadow-sm mb-2 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <PiggyBank className="text-orange-400 w-8 h-8" />
            
            <div className="relative">
              <button 
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
              >
                <span className="font-bold text-sm tracking-tight text-gray-700">{activeWorkspaceName}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isWorkspaceMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceMenuOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {workspaces.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setActiveWorkspace(w.id);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 font-bold text-sm flex items-center justify-between hover:bg-orange-50 transition-colors ${activeWorkspace === w.id ? 'text-orange-500 bg-orange-50/50' : 'text-gray-600'}`}
                      >
                        {w.name}
                        {activeWorkspace === w.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setSyncTrigger(prev => prev + 1)} 
              title="データを再同期"
              aria-label="データを再同期"
              className={`p-2 bg-gray-50 rounded-full text-gray-400 hover:text-orange-400 transition-all ${isSyncing ? 'animate-spin text-orange-400' : 'active:scale-90'}`}
            >
              <RefreshCw size={18} />
            </button>
            <button onClick={() => showConfirm("ログアウトしますか？", () => signOut(auth))} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-orange-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ切り替え */}
      <main>
        {activeTab === 'input' && <InputScreen />}
        {activeTab === 'report' && <ReportScreen />}
        {activeTab === 'asset' && <AssetScreen />}
        {activeTab === 'future' && <FutureScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>

      {/* カスタム確認モーダル */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <p className="font-bold text-gray-700 text-center mb-6 whitespace-pre-wrap">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={closeConfirm} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200">キャンセル</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-rose-400 text-white font-bold rounded-xl hover:bg-rose-500 shadow-md">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ボトムナビゲーションバー */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 pb-safe pt-2 px-2 z-40 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <NavButton id="input" icon={<Edit3 />} label="入力" active={activeTab} onClick={setActiveTab} />
          <NavButton id="report" icon={<PieChartIcon />} label="レポート" active={activeTab} onClick={setActiveTab} />
          <NavButton id="asset" icon={<Landmark />} label="資産" active={activeTab} onClick={setActiveTab} />
          <NavButton id="future" icon={<Telescope />} label="みらい" active={activeTab} onClick={setActiveTab} />
          <NavButton id="settings" icon={<Settings />} label="設定" active={activeTab} onClick={setActiveTab} />
        </div>
      </div>
    </div>
  );
}

function NavButton({ id, icon, label, active, onClick }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all ${isActive ? 'text-orange-500 scale-110' : 'text-gray-400 hover:bg-orange-50'}`}
    >
      <div className={`mb-1 transition-all ${isActive ? 'drop-shadow-md' : ''}`}>
        {React.cloneElement(icon, { size: isActive ? 24 : 22, strokeWidth: isActive ? 2.5 : 2 })}
      </div>
      <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}
