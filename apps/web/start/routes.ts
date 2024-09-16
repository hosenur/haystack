/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import HistoriesController from '#controllers/histories_controller'
import router from '@adonisjs/core/services/router'
router.on('/').renderInertia('home', { version: 6 })
router.post('/history', [HistoriesController, 'store'])


