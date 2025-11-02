                              //OpenVideoDialog.h//
//////////////////////////////////////////////////////////////////////////////////
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

#include <wx/wx.h>
#include <wx/dialog.h>

// Dialog for selecting video opening method at startup
class COpenVideoDialog : public wxDialog
{
public:
    COpenVideoDialog(wxWindow* parent);
    ~COpenVideoDialog();

    enum VideoOpenMethod
    {
        METHOD_NONE = -1,
        METHOD_OPENCV = 0,
        METHOD_FFMPEG = 1,
        METHOD_REOPEN = 2,
        METHOD_OPEN_PREVIOUS = 3,
        METHOD_CANCEL = 4
    };

    VideoOpenMethod GetSelectedMethod() const { return m_selectedMethod; }

private:
    void OnOpenCV(wxCommandEvent& event);
    void OnFFMPEG(wxCommandEvent& event);
    void OnReopen(wxCommandEvent& event);
    void OnOpenPrevious(wxCommandEvent& event);
    void OnCancel(wxCommandEvent& event);
    void OnClose(wxCloseEvent& event);

    VideoOpenMethod m_selectedMethod;

    wxButton* m_pBtnOpenCV;
    wxButton* m_pBtnFFMPEG;
    wxButton* m_pBtnReopen;
    wxButton* m_pBtnOpenPrevious;
    wxButton* m_pBtnCancel;

    DECLARE_EVENT_TABLE()
};
