import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { renderLayout } from './js/layout.js'
import { supabase } from './js/supabaseClient.js'

await renderLayout()
window.dispatchEvent(new Event('layout:ready'))