                              //SearchPanel.h//                                
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

#pragma once
#include <wx/panel.h>
#include <wx/stattext.h>
#include <wx/textctrl.h>
#include <wx/gauge.h>
#include <thread>
#include <mutex>
#include "SSOWnd.h"
#include "Button.h"
#include "StaticText.h"
#include "TextCtrl.h"
#include "MyResource.h"

class CMainFrame;
class CSSOWnd;

extern int g_IsSearching;
extern int g_IsClose;

void ThreadSearchSubtitles();

class CSearchPanel : public wxPanel, public CControl
{
public:
	CSearchPanel(CSSOWnd* pParent);
	~CSearchPanel();

	std::mutex m_rs_mutex;

	CButton	*m_pClear;
	CButton	*m_pRun;

	wxPanel		*m_pP1;
	wxPanel     *m_pAutoDetectPanel;  // Sub-panel for auto-detection controls
    wxPanel     *m_pSearchPanel;      // Sub-panel for search controls

	CStaticText  *m_plblBT1;
	CTextCtrl  *m_plblBTA1;
	CStaticText  *m_plblBT2;
	CTextCtrl  *m_plblBTA2;

	// Auto-detection progress controls
	wxGauge     *m_pAutoDetectProgress;
	CStaticText *m_plblAutoDetectInfo;
	CButton     *m_pBtnStopAutoDetect;
	bool        m_bStopAutoDetect;
	bool        m_bPausedAutoDetect;

	CSSOWnd		*m_pParent;

	CMainFrame	*m_pMF;

	std::thread m_SearchThread;

	void Init();

public:
	//HBRUSH OnCtlColor(CDC* pDC, CWnd* pWnd, UINT nCtlColor);
	void OnBnClickedRun(wxCommandEvent& event);
	void OnBnClickedClear(wxCommandEvent& event);
	void OnTimeTextEnter(wxCommandEvent& evt);
	void ThreadSearchSubtitlesEnd(wxCommandEvent& event);
	void UpdateSize() override;
	void RefreshData() override;

	// Auto-detection progress methods
	void ShowAutoDetectProgress(bool show);
	void UpdateAutoDetectProgress(int current, int total);
	void OnBnClickedStopAutoDetect(wxCommandEvent& event);

private:
	// Label strings for auto-detect controls (must persist for CButton/CStaticText lifetime)
	wxString m_strAutoDetectInfoLabel;
	wxString m_strStopDetectionLabel;
	wxString m_strResumeDetectionLabel;

   DECLARE_EVENT_TABLE()
};
