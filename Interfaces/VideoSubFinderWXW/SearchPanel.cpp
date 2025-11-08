                              //SearchPanel.cpp//                                
//////////////////////////////////////////////////////////////////////////////////
//																				//
// Author:  Simeon Kosnitsky													//
//          skosnits@gmail.com													//
//																				//
// License:																		//
//     This software is released into the public domain.  You are free to use	//
//     it in any way you like, except that you may not sell this source code.	//
//																				//
//     This software is provided "as is" with no expressed or implied warranty.	//
//     I accept no liability for any damage or loss of business that this		//
//     software may cause.														//
//																				//
//////////////////////////////////////////////////////////////////////////////////

#define _HAS_STD_BYTE 0
#include "SearchPanel.h"
#include <exception>
#include <wx/sound.h>
#include <wx/gbsizer.h>

int g_IsSearching = 0;
int g_IsClose = 0;

wxDEFINE_EVENT(THREAD_SEARCH_SUBTITLES_END, wxCommandEvent);

BEGIN_EVENT_TABLE(CSearchPanel, wxPanel)
	EVT_COMMAND(wxID_ANY, THREAD_SEARCH_SUBTITLES_END, CSearchPanel::ThreadSearchSubtitlesEnd)
	EVT_BUTTON(ID_BTN_CLEAR, CSearchPanel::OnBnClickedClear)
	EVT_BUTTON(ID_BTN_RUN, CSearchPanel::OnBnClickedRun)
	EVT_BUTTON(ID_BTN_STOP_AUTO_DETECT, CSearchPanel::OnBnClickedStopAutoDetect)
END_EVENT_TABLE()

CSearchPanel::CSearchPanel(CSSOWnd* pParent)
		:wxPanel( pParent, wxID_ANY )
{
	m_pParent = pParent;
	m_pMF = pParent->m_pMF;

	// Initialize label strings for auto-detect controls
	m_strAutoDetectInfoLabel = wxT("");
	m_strStopDetectionLabel = wxT("Stop Detection");
}

CSearchPanel::~CSearchPanel()
{
}

void CSearchPanel::Init()
{
	SaveToReportLog("CSearchPanel::Init(): starting...\n");

	wxRect rcP1, rcClP1, rcBT1, rcBTA1, rcBT2, rcBTA2, rcClear, rcRun;
	wxRect rcProgress, rcProgressInfo, rcStopButton;
	wxRect rcAutoDetectPanel, rcSearchPanel;

	int panel_width = 374;  // Both panels same width
	int gap = 10;

	// Auto-detection panel on the left
	rcAutoDetectPanel.x = 0;
	rcAutoDetectPanel.y = 0;
	rcAutoDetectPanel.width = panel_width;
	rcAutoDetectPanel.height = 130;

	// Search panel on the right, next to auto-detection panel
	rcSearchPanel.x = rcAutoDetectPanel.GetRight() + gap;
	rcSearchPanel.y = 0;
	rcSearchPanel.width = panel_width;
	rcSearchPanel.height = 130;

	// Main panel P1 contains both sub-panels side-by-side
	rcP1.x = 10;
	rcP1.y = 10;
	rcP1.width = rcSearchPanel.GetRight() + 10;
	rcP1.height = 130 + 20;

	SaveToReportLog("CSearchPanel::Init(): init m_pP1...\n");
	m_pP1 = new wxPanel( this, wxID_ANY, rcP1.GetPosition(), rcP1.GetSize() );
	m_pP1->SetBackgroundColour(g_cfg.m_notebook_panels_colour);

	// Create auto-detection sub-panel
	SaveToReportLog("CSearchPanel::Init(): init m_pAutoDetectPanel...\n");
	m_pAutoDetectPanel = new wxPanel(m_pP1, wxID_ANY, rcAutoDetectPanel.GetPosition(), rcAutoDetectPanel.GetSize());
	m_pAutoDetectPanel->SetBackgroundColour(wxColour(170, 170, 170));  // Slightly different color to distinguish
	SaveToReportLog("CSearchPanel::Init(): m_pAutoDetectPanel created.\n");

	// Create search controls sub-panel
	SaveToReportLog("CSearchPanel::Init(): init m_pSearchPanel...\n");
	m_pSearchPanel = new wxPanel(m_pP1, wxID_ANY, rcSearchPanel.GetPosition(), rcSearchPanel.GetSize());
	m_pSearchPanel->SetBackgroundColour(g_cfg.m_notebook_panels_colour);
	SaveToReportLog("CSearchPanel::Init(): m_pSearchPanel created.\n");

	// === Auto-detection controls (in m_pAutoDetectPanel) ===
	rcProgress.x = 20;
	rcProgress.y = 10;
	rcProgress.width = 334;  // Match search panel width
	rcProgress.height = 20;

	rcProgressInfo.x = rcProgress.x;
	rcProgressInfo.y = rcProgress.GetBottom() + 5;
	rcProgressInfo.width = rcProgress.width;
	rcProgressInfo.height = 20;

	rcStopButton.x = rcProgress.x + (rcProgress.width - 150) / 2;  // Center button
	rcStopButton.y = rcProgressInfo.GetBottom() + 10;
	rcStopButton.width = 150;
	rcStopButton.height = 30;

	// === Search controls (in m_pSearchPanel) ===
	// Note: m_pSearchPanel has its own coordinate system starting at (0,0)
	rcBT1.x = 20;
	rcBT1.y = 10;
	rcBT1.width = 90;
	rcBT1.height = 20;

	rcBTA1.x = rcBT1.GetRight()+4;
	rcBTA1.y = rcBT1.y;
	rcBTA1.width = 260;
	rcBTA1.height = rcBT1.height;

	rcBT2.x = rcBT1.x;
	rcBT2.y = rcBT1.GetBottom() + 6;
	rcBT2.width = rcBT1.width;
	rcBT2.height = rcBT1.height;

	rcBTA2.x = rcBTA1.x;
	rcBTA2.y = rcBT2.y;
	rcBTA2.width = rcBTA1.width;
	rcBTA2.height = rcBT1.height;

	rcClear.x = rcBT2.x + 8;
	rcClear.y = rcBT2.GetBottom() + 10;
	rcClear.width = 150;
	rcClear.height = 30;

	rcRun.width = rcClear.width;
	rcRun.height = rcClear.height;
	rcRun.x = rcBTA2.GetRight() - 8 - rcRun.width;
	rcRun.y = rcClear.y;

	// === Create search controls in m_pSearchPanel ===
	SaveToReportLog("CSearchPanel::Init(): init m_plblBT1...\n");
	m_plblBT1 = new CStaticText(m_pSearchPanel, g_cfg.m_label_begin_time, wxID_ANY);
	m_plblBT1->SetSize(rcBT1);
	wxSize bt1_min_size = rcBT1.GetSize();
	m_plblBT1->SetMinSize(bt1_min_size);

	SaveToReportLog("CSearchPanel::Init(): init m_plblBT2...\n");
	m_plblBT2 = new CStaticText(m_pSearchPanel, g_cfg.m_label_end_time, wxID_ANY);
	m_plblBT2->SetSize(rcBT2);
	wxSize bt2_min_size = rcBT2.GetSize();
	m_plblBT2->SetMinSize(bt2_min_size);

	SaveToReportLog("CSearchPanel::Init(): init m_plblBTA1...\n");
	m_plblBTA1 = new CTextCtrl(m_pSearchPanel, ID_LBL_BEGIN_TIME,
		ConvertVideoTime(0), wxString("^[0-9][0-9]:[0-5][0-9]:[0-5][0-9]:[0-9][0-9][0-9]$"), rcBTA1.GetPosition(), rcBTA1.GetSize(), wxALIGN_LEFT | wxST_NO_AUTORESIZE | wxBORDER);
	m_plblBTA1->Bind(wxEVT_TEXT_ENTER, &CSearchPanel::OnTimeTextEnter, this);
	wxSize bta1_min_size = rcBTA1.GetSize();
	m_plblBTA1->SetMinSize(bta1_min_size);

	SaveToReportLog("CSearchPanel::Init(): init m_plblBTA2...\n");
	m_plblBTA2 = new CTextCtrl(m_pSearchPanel, ID_LBL_END_TIME,
		ConvertVideoTime(0), wxString("^[0-9][0-9]:[0-5][0-9]:[0-5][0-9]:[0-9][0-9][0-9]$"), rcBTA2.GetPosition(), rcBTA2.GetSize(), wxALIGN_LEFT | wxST_NO_AUTORESIZE | wxBORDER );
	m_plblBTA2->Bind(wxEVT_TEXT_ENTER, &CSearchPanel::OnTimeTextEnter, this);
	wxSize bta2_min_size = rcBTA2.GetSize();
	m_plblBTA2->SetMinSize(bta2_min_size);

	SaveToReportLog("CSearchPanel::Init(): init m_pClear...\n");
	m_pClear = new CButton(m_pSearchPanel, ID_BTN_CLEAR, g_cfg.m_main_buttons_colour, g_cfg.m_main_buttons_colour_focused, g_cfg.m_main_buttons_colour_selected, g_cfg.m_main_buttons_border_colour,
		g_cfg.m_button_clear_folders_text, rcClear.GetPosition(), rcClear.GetSize() );
	wxSize clear_min_size =  rcClear.GetSize();
	m_pClear->SetMinSize(clear_min_size);

	SaveToReportLog("CSearchPanel::Init(): init m_pRun...\n");
	m_pRun = new CButton(m_pSearchPanel, ID_BTN_RUN, g_cfg.m_main_buttons_colour, g_cfg.m_main_buttons_colour_focused, g_cfg.m_main_buttons_colour_selected, g_cfg.m_main_buttons_border_colour,
		g_cfg.m_button_run_search_text, rcRun.GetPosition(), rcRun.GetSize() );
	wxSize run_min_size = rcRun.GetSize();
	m_pRun->SetMinSize(run_min_size);

	// === Create auto-detection controls in m_pAutoDetectPanel ===
	SaveToReportLog("CSearchPanel::Init(): init m_pAutoDetectProgress...\n");
	m_pAutoDetectProgress = new wxGauge(m_pAutoDetectPanel, wxID_ANY, 100, rcProgress.GetPosition(), rcProgress.GetSize());
	m_pAutoDetectProgress->SetValue(0);

	SaveToReportLog("CSearchPanel::Init(): init m_plblAutoDetectInfo...\n");
	m_plblAutoDetectInfo = new CStaticText(m_pAutoDetectPanel, m_strAutoDetectInfoLabel, wxID_ANY);
	m_plblAutoDetectInfo->SetSize(rcProgressInfo);

	wxColour *bg_colour = new wxColour(240, 240, 240);
	m_plblAutoDetectInfo->SetBackgroundColour(*bg_colour);

	SaveToReportLog("CSearchPanel::Init(): init m_pBtnStopAutoDetect...\n");
	m_pBtnStopAutoDetect = new CButton(m_pAutoDetectPanel, ID_BTN_STOP_AUTO_DETECT,
		g_cfg.m_main_buttons_colour, g_cfg.m_main_buttons_colour_focused, g_cfg.m_main_buttons_colour_selected, g_cfg.m_main_buttons_border_colour,
		m_strStopDetectionLabel, rcStopButton.GetPosition(), rcStopButton.GetSize());
	m_pBtnStopAutoDetect->Enable(false);  // Disabled when not running
	m_pBtnStopAutoDetect->Show();
	m_pBtnStopAutoDetect->Raise();  // Ensure button is on top

	m_bStopAutoDetect = false;

	m_plblBT1->SetBackgroundColour(g_cfg.m_main_labels_background_colour);
	m_plblBT2->SetBackgroundColour(g_cfg.m_main_labels_background_colour);
	m_plblBTA1->SetBackgroundColour( g_cfg.m_main_text_ctls_background_colour );
	m_plblBTA2->SetBackgroundColour( g_cfg.m_main_text_ctls_background_colour );

	SaveToReportLog("CSearchPanel::Init(): setting fonts...\n");
	m_plblBT1->SetFont(m_pMF->m_LBLFont);
    m_plblBT2->SetFont(m_pMF->m_LBLFont);
    m_plblBTA1->SetFont(m_pMF->m_LBLFont);
    m_plblBTA2->SetFont(m_pMF->m_LBLFont);
    m_pClear->SetFont(m_pMF->m_BTNFont);
    m_pRun->SetFont(m_pMF->m_BTNFont);
	m_pBtnStopAutoDetect->SetFont(m_pMF->m_BTNFont);

	SaveToReportLog("CSearchPanel::Init(): setting text colors...\n");
	m_plblBT1->SetTextColour(g_cfg.m_main_text_colour);
    m_plblBT2->SetTextColour(g_cfg.m_main_text_colour);
    m_plblBTA1->SetTextColour(g_cfg.m_main_text_colour);
    m_plblBTA2->SetTextColour(g_cfg.m_main_text_colour);
    m_pClear->SetTextColour(g_cfg.m_main_text_colour);
    m_pRun->SetTextColour(g_cfg.m_main_text_colour);
	m_pBtnStopAutoDetect->SetTextColour(g_cfg.m_main_text_colour);

	SaveToReportLog("CSearchPanel::Init(): fonts and colors set.\n");

	// m_pP1 location sizer
	{
		SaveToReportLog("CSearchPanel::Init(): creating outer sizer...\n");
		wxBoxSizer* top_sizer = new wxBoxSizer(wxVERTICAL);
		wxBoxSizer* button_sizer = new wxBoxSizer(wxHORIZONTAL);
		button_sizer->Add(m_pP1, 1, wxALIGN_CENTER, 0);
		top_sizer->Add(button_sizer, 1, wxALIGN_CENTER);
		this->SetSizer(top_sizer);

		// m_pP1 elements location sizer - now manages the two sub-panels side-by-side
		{
			wxBoxSizer* hor_box_sizer = new wxBoxSizer(wxHORIZONTAL);

			// Add auto-detection panel on the left
			hor_box_sizer->Add(m_pAutoDetectPanel, 0, wxALL, 0);
			hor_box_sizer->AddSpacer(10);  // Gap between panels

			// Add search panel on the right
			hor_box_sizer->Add(m_pSearchPanel, 0, wxALL, 0);

			m_pP1->SetSizer(hor_box_sizer);
		}

		SaveToReportLog("CSearchPanel::Init(): outer sizer created.\n");
	}

	SaveToReportLog("CSearchPanel::Init(): finished.\n");
}

void CSearchPanel::RefreshData()
{
	m_pP1->SetBackgroundColour(g_cfg.m_notebook_panels_colour);
}

void CSearchPanel::UpdateSize()
{
	// Check if m_pP1 has a sizer; if not, use the current size
	wxSize best_size;
	if (m_pP1->GetSizer())
	{
		best_size = m_pP1->GetSizer()->GetMinSize();
		wxSize cur_size = m_pP1->GetSize();
		wxSize cur_client_size = m_pP1->GetClientSize();
		best_size.x += cur_size.x - cur_client_size.x + 20;
		best_size.y += cur_size.y - cur_client_size.y + 20;
	}
	else
	{
		// No sizer, use the panel's current min size
		best_size = m_pP1->GetMinSize();
	}

	if (this->GetSizer())
	{
		this->GetSizer()->SetItemMinSize(m_pP1, best_size);
		this->GetSizer()->Layout();
	}
}

void CSearchPanel::OnTimeTextEnter(wxCommandEvent& evt)
{
	int id = evt.GetId();
	CTextCtrl* pTimeTextCtrl;
	s64* pTime;

	if (id == ID_LBL_BEGIN_TIME)
	{
		pTimeTextCtrl = m_plblBTA1;
		pTime = &(m_pMF->m_BegTime);
	}
	else
	{
		pTimeTextCtrl = m_plblBTA2;
		pTime = &(m_pMF->m_EndTime);
	}

	pTimeTextCtrl->OnTextEnter(evt);
	if (m_pMF->m_VIsOpen)
	{
		*pTime = GetVideoTime(pTimeTextCtrl->GetValue());

		if (*pTime > m_pMF->m_pVideo->m_Duration)
		{
			*pTime = m_pMF->m_pVideo->m_Duration;
			pTimeTextCtrl->SetValue(ConvertVideoTime(*pTime));
		}
		
		if (m_pMF->m_vs != CMainFrame::Play)
		{
			m_pMF->m_pVideo->SetPos(*pTime);
		}
	}
}

void CSearchPanel::OnBnClickedRun(wxCommandEvent& event)
{
	std::unique_lock<std::mutex> lock(m_rs_mutex);

	if (m_pMF->m_VIsOpen)
	{
		wxCommandEvent event;
		m_pMF->OnStop(event);

		m_pMF->m_VIsOpen = false;

		if ( m_pMF->m_timer.IsRunning() ) 
		{
			m_pMF->m_timer.Stop();
		}

		m_pMF->m_ct = -1;

		
		m_pMF->m_timer.Start(1000);

		m_pRun->SetLabel(g_cfg.m_button_run_search_stop_text);
		this->UpdateSize();

		m_pMF->m_pVideoBox->m_pButtonPause->Disable();
		m_pMF->m_pVideoBox->m_pButtonRun->Disable();
		m_pMF->m_pVideoBox->m_pButtonStop->Disable();

		m_pMF->m_pPanel->m_pSSPanel->Disable();
		m_pMF->m_pPanel->m_pOCRPanel->Disable();
		m_pMF->m_pImageBox->ClearScreen();

		m_pMF->m_BegTime = GetVideoTime(m_plblBTA1->GetValue());
		m_pMF->m_EndTime = GetVideoTime(m_plblBTA2->GetValue());

		if (m_pMF->m_pVideo->SetNullRender())
		{
			m_pClear->Disable();
			m_plblBTA1->SetEditable(false);
			m_plblBTA2->SetEditable(false);
			g_color_ranges = GetColorRanges(g_use_filter_color);
			g_outline_color_ranges = GetColorRanges(g_use_outline_filter_color);

			m_pMF->m_pVideo->SetVideoWindowSettins(
			std::min<double>(g_pMF->m_pVideoBox->m_pVBox->m_pVSL1->m_pos, g_pMF->m_pVideoBox->m_pVBox->m_pVSL2->m_pos),
			std::max<double>(g_pMF->m_pVideoBox->m_pVBox->m_pVSL1->m_pos, g_pMF->m_pVideoBox->m_pVBox->m_pVSL2->m_pos),
			std::min<double>(g_pMF->m_pVideoBox->m_pVBox->m_pHSL1->m_pos, g_pMF->m_pVideoBox->m_pVBox->m_pHSL2->m_pos),
			std::max<double>(g_pMF->m_pVideoBox->m_pVBox->m_pHSL1->m_pos, g_pMF->m_pVideoBox->m_pVBox->m_pHSL2->m_pos));

			g_IsSearching = 1;
			g_RunSubSearch = 1;
			m_SearchThread = std::thread(ThreadSearchSubtitles);
		}
	}
	else
	{
		if (g_IsSearching == 1)
		{
			m_pMF->m_timer.Stop();
			wxTimerEvent event(m_pMF->m_timer);
			m_pMF->OnTimer(event);

			g_RunSubSearch = 0;
			m_SearchThread.join();
		}
	}
}

void CSearchPanel::OnBnClickedClear(wxCommandEvent& event)
{
	m_pMF->ClearDir(g_work_dir + "/RGBImages");
	m_pMF->ClearDir(g_work_dir + "/ISAImages");
	m_pMF->ClearDir(g_work_dir + "/ILAImages");
	m_pMF->ClearDir(g_work_dir + "/TXTImages");
	m_pMF->ClearDir(g_work_dir + "/ImagesJoined");
	m_pMF->ClearDir(g_work_dir + "/DebugImages");
	m_pMF->ClearDir(g_work_dir + "/TXTResults");
	m_pMF->ClearDir(g_work_dir + "/TestImages/RGBImages");
	m_pMF->ClearDir(g_work_dir + "/TestImages/TXTImages");
}

void ThreadSearchSubtitles()
{
	try
	{
		g_text_alignment = ConvertStringToTextAlignment(g_text_alignment_string);
		g_pMF->m_BegTime = FastSearchSubtitles(g_pMF->m_pVideo, g_pMF->m_BegTime, g_pMF->m_EndTime);
	}
	catch (const exception& e)
	{
		SaveError(wxT("Got C++ Exception: got error in ThreadSearchSubtitles() ") + wxString(e.what()) + wxT("\n"));
	}
	
	if (!(g_pMF->m_blnNoGUI))
	{
		SaveToReportLog("ThreadSearchSubtitles: wxPostEvent THREAD_SEARCH_SUBTITLES_END ...\n");
		wxCommandEvent event(THREAD_SEARCH_SUBTITLES_END); // No specific id
		wxPostEvent(g_pMF->m_pPanel->m_pSHPanel, event);
	}
	else
	{
		g_IsSearching = 0;
		g_RunSubSearch = 0;
	}
}

void CSearchPanel::ThreadSearchSubtitlesEnd(wxCommandEvent& event)
{
	std::unique_lock<std::mutex> lock(m_rs_mutex);

	if (m_SearchThread.joinable())
	{
		m_SearchThread.join();
	}

	if (g_IsClose == 1) 
	{
		g_IsSearching = 0;
		return;
	}

	if (!(m_pMF->m_blnNoGUI))
	{
		if (g_RunSubSearch == 1)
		{
			m_pMF->m_timer.Stop();
			wxTimerEvent event(m_pMF->m_timer);
			m_pMF->OnTimer(event);
		}
		else
		{
			wxCommandEvent  menu_event(wxEVT_COMMAND_MENU_SELECTED, ID_FILE_REOPENVIDEO);
			m_pMF->OnFileReOpenVideo(menu_event);
		}

		m_pRun->SetLabel(g_cfg.m_button_run_search_text);
		this->UpdateSize();

		m_pMF->m_pPanel->m_pSSPanel->Enable();
		m_pMF->m_pPanel->m_pOCRPanel->Enable();

		if ((g_RunSubSearch == 1) && (g_CLEAN_RGB_IMAGES == true))
		{
			wxCommandEvent bn_event(wxEVT_COMMAND_BUTTON_CLICKED, ID_BTN_CCTI);
			m_pMF->m_pPanel->m_pOCRPanel->OnBnClickedCreateClearedTextImages(bn_event);
		}
		else if ((g_RunSubSearch == 1) && g_playback_sound)
		{
			SaveToReportLog("ThreadSearchSubtitlesEnd: trying to play sound ...\n");
			wxString Str = g_app_dir + wxT("/finished.wav");
			PlaySound(Str);
		}

		m_pClear->Enable();
		m_plblBTA1->SetEditable(true);
		m_plblBTA2->SetEditable(true);
	}

	g_IsSearching = 0;
	g_RunSubSearch = 0;

	return;
}

void CSearchPanel::ShowAutoDetectProgress(bool show)
{
	if (show)
	{
		SaveToReportLog("ShowAutoDetectProgress: Showing and enabling stop button\n");
		m_pAutoDetectProgress->SetValue(0);
		wxString detectingLabel = wxT("Detecting subtitle boundaries...");
		m_plblAutoDetectInfo->SetLabel(detectingLabel);
		m_pBtnStopAutoDetect->Enable(true);
		m_pBtnStopAutoDetect->Show();
		m_pBtnStopAutoDetect->Raise();
		m_bStopAutoDetect = false;
		m_pAutoDetectPanel->Refresh();
		m_pAutoDetectPanel->Update();
		wxYield();  // Ensure UI updates immediately
	}
	else
	{
		SaveToReportLog("ShowAutoDetectProgress: Disabling stop button, keeping progress visible\n");
		// Keep the progress bar and text visible, just disable the stop button
		// Don't reset progress value or clear the label
		m_pBtnStopAutoDetect->Enable(false);
		m_pAutoDetectPanel->Refresh();
	}
}

void CSearchPanel::UpdateAutoDetectProgress(int current, int total)
{
	if (total > 0)
	{
		int percentage = (int)((double)current / (double)total * 100.0);
		m_pAutoDetectProgress->SetValue(percentage);

		wxString info = wxString::Format(wxT("Detecting subtitle bounds: %d / %d frames (%d%%)"),
		                                  current, total, percentage);
		m_plblAutoDetectInfo->SetLabel(info);

		// Force immediate UI update
		m_plblAutoDetectInfo->Update();
		m_pAutoDetectProgress->Update();

		// Process events to keep UI responsive
		wxYield();
	}
}

void CSearchPanel::OnBnClickedStopAutoDetect(wxCommandEvent& event)
{
	m_bStopAutoDetect = true;
	SaveToReportLog("Auto-detection stop requested by user\n");
}

